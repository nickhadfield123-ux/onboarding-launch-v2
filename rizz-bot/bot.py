"""
Rizz — Resourceful's AI call participant
Joins Daily.co rooms, listens to all speakers via Groq Whisper,
responds via Groq (Llama 3.3) + PlayAI TTS, detects bounties live,
generates personalised post-call summaries (Groq, falls back to Mistral).

Run: python bot.py --room <daily-room-url> [--token <daily-token>]
"""

import argparse
import asyncio
import json
import os
import re
import wave
from datetime import datetime
from typing import Optional

import aiohttp
from dotenv import load_dotenv
from loguru import logger

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import (
    EndFrame,
    LLMMessagesUpdateFrame,
    TranscriptionFrame,
)
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
)
from pipecat.services.groq.llm import GroqLLMService
from pipecat.services.groq.tts import GroqTTSService
from pipecat.transports.daily.transport import DailyTransport
from pipecat.transports.daily.transport import DailyParams

# Mistral SDK imported at top level for the post-call fallback
from mistralai import Mistral

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────

DAILY_API_KEY   = os.getenv("DAILY_API_KEY", "206b1febd1e8b7b95f1de531ecf5adeee256f91c013d7313402ff113be76dc3b")
GROQ_API_KEY    = os.getenv("GROQ_API_KEY", "")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "")
SUPABASE_URL    = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY    = os.getenv("SUPABASE_SERVICE_KEY", "")

# ── Transcript store (shared across the session) ──────────────────────────────

class CallSession:
    """Holds everything Rizz knows about the current call."""

    def __init__(self, room_url: str):
        self.room_url = room_url
        self.started_at = datetime.utcnow()
        self.participant_profiles: dict[str, dict] = {}  # session_id -> profile
        self.transcript: list[dict] = []                 # {ts, speaker, text}
        self.bounties_detected: list[dict] = []          # {text, claimer, ts}
        self.recording_frames: list[bytes] = []          # raw PCM for local recording

    def add_line(self, speaker: str, text: str):
        entry = {
            "ts": datetime.utcnow().isoformat(),
            "speaker": speaker,
            "text": text,
        }
        self.transcript.append(entry)
        logger.info(f"[{speaker}] {text}")
        return entry

    def transcript_text(self) -> str:
        return "\n".join(f"[{e['speaker']}]: {e['text']}" for e in self.transcript)

    def save_recording(self, path: str):
        """Save accumulated PCM frames as a WAV file."""
        if not self.recording_frames:
            return
        with wave.open(path, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(16000)
            wf.writeframes(b"".join(self.recording_frames))
        logger.info(f"Recording saved: {path}")


# ── Supabase profile fetcher ──────────────────────────────────────────────────

async def fetch_participant_profiles(session: aiohttp.ClientSession, emails: list[str]) -> dict:
    """
    Pull profiles from Supabase user_profiles + member_context.
    Falls back to empty profile if not found.
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.warning("Supabase not configured — using empty profiles")
        return {}

    profiles = {}
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }

    for email in emails:
        try:
            url = f"{SUPABASE_URL}/rest/v1/user_profiles?select=*&email=eq.{email}"
            async with session.get(url, headers=headers) as resp:
                data = await resp.json()
                if data:
                    profile = data[0]
                    # Also fetch member_context
                    user_id = profile.get("user_id") or profile.get("id")
                    if user_id:
                        ctx_url = f"{SUPABASE_URL}/rest/v1/member_context?select=*&user_id=eq.{user_id}"
                        async with session.get(ctx_url, headers=headers) as ctx_resp:
                            ctx = await ctx_resp.json()
                            if ctx:
                                profile["context"] = ctx[0]
                    profiles[email] = profile
        except Exception as e:
            logger.warning(f"Could not fetch profile for {email}: {e}")
            profiles[email] = {}

    return profiles


# ── Rizz persona builder ──────────────────────────────────────────────────────

def build_system_prompt(session: CallSession) -> str:
    """Build Rizz's system prompt, injecting all participant profiles."""

    profile_blocks = []
    for name, profile in session.participant_profiles.items():
        building = profile.get("building") or profile.get("project") or "unknown project"
        interests = profile.get("interests") or []
        if isinstance(interests, list):
            interests_str = ", ".join(interests)
        else:
            interests_str = str(interests)
        ctx = profile.get("context", {})
        story = ctx.get("story") or profile.get("bio") or ""
        block = f"""
Participant: {name}
  Building: {building}
  Interests: {interests_str}
  Story: {story}
""".strip()
        profile_blocks.append(block)

    participants_section = "\n\n".join(profile_blocks) if profile_blocks else "No profile data loaded yet."

    return f"""You are Rizz — the AI co-facilitator of the Resourceful community.

You are live on a video call RIGHT NOW as a visible participant tile. You can hear and speak.

Your personality:
- Warm, sharp, community-minded. A bit playful but never sycophantic.
- You speak in short voice-friendly sentences. No bullet points. No markdown.
- You know everyone on the call personally — see their profiles below.
- You're here to help the call go well: surface connections, spot opportunities, flag bounties.

PARTICIPANT PROFILES:
{participants_section}

YOUR CALL RESPONSIBILITIES:
1. Listen and participate naturally when addressed.
2. Detect bounties: when someone says they need something done OR offers to do something,
   note it quietly. If it sounds like a real bounty, say "Noted — I'll add that to bounties."
3. Make introductions: if two people have overlapping interests you can say so.
4. Keep track of the conversation for post-call summaries.

VOICE RULES (critical):
- Speak in 1-3 sentences max per turn.
- Never say "I" as the first word.
- Use people's first names.
- Avoid filler phrases like "Certainly!" or "Great question!".
- Sound like a smart friend on the call, not a bot.

Current time: {datetime.utcnow().strftime('%H:%M UTC')}
"""


# ── Bounty detector ───────────────────────────────────────────────────────────

BOUNTY_PATTERNS = [
    r"i (can|could|will|would) (do|handle|build|write|create|run|take care of)",
    r"i'll (do|handle|build|write|create|run|take)",
    r"(need|needs|looking for|want) (someone|a person|anyone|help|somebody) to",
    r"(can anyone|anyone able to|could someone|does anyone)",
    r"(happy to|willing to|able to|i could) (help with|take on|do|build)",
]

def detect_bounty(text: str, speaker: str) -> Optional[dict]:
    """Return a bounty dict if this utterance looks like one."""
    text_lower = text.lower()
    for pattern in BOUNTY_PATTERNS:
        if re.search(pattern, text_lower):
            claimer = None
            if any(p in text_lower for p in ["i can", "i will", "i'll", "happy to", "willing to", "able to"]):
                claimer = speaker
            return {
                "text": text,
                "speaker": speaker,
                "claimer": claimer,
                "ts": datetime.utcnow().isoformat(),
                "claimed": claimer is not None,
            }
    return None


# ── Post-call summary generator ───────────────────────────────────────────────

async def generate_post_call_summary(session: CallSession, groq_api_key: str) -> dict:
    """
    Generate global + per-person summaries, bounties, action items.
    Uses Groq (Llama 3.3) with Mistral (mistral-large-latest) as fallback.
    """
    if not session.transcript:
        return {"error": "No transcript available"}

    transcript_text = session.transcript_text()
    duration_mins = int((datetime.utcnow() - session.started_at).seconds / 60)

    def call_llm(prompt: str, max_tokens: int = 400) -> str:
        """Call Groq, fall back to Mistral on rate limit or error."""
        import groq as groq_sdk
        try:
            client = groq_sdk.Groq(api_key=groq_api_key)
            resp = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
            )
            return resp.choices[0].message.content
        except Exception as groq_err:
            logger.warning(f"Groq failed ({groq_err}), trying Mistral...")
            if not MISTRAL_API_KEY:
                raise groq_err
            # Mistral client imported at module level
            mc = Mistral(api_key=MISTRAL_API_KEY)
            resp = mc.chat.complete(
                model="mistral-large-latest",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
            )
            return resp.choices[0].message.content

    # --- Global summary ---
    global_prompt = f"""You are summarising a Resourceful community call.

TRANSCRIPT:
{transcript_text}

Write a concise summary (150-200 words) covering:
1. Main topics discussed
2. Key decisions or outcomes
3. Bounties mentioned (claimed or open)
4. Notable connections or introductions made

Be specific. Use names. Plain prose, no bullet points."""

    global_summary = call_llm(global_prompt, max_tokens=400)

    # --- Per-person summaries ---
    per_person = {}
    for name, profile in session.participant_profiles.items():
        building = profile.get("building") or "your project"
        interests = profile.get("interests") or []
        if isinstance(interests, list):
            interests_str = ", ".join(interests)
        else:
            interests_str = str(interests)

        personal_prompt = f"""You are writing a personalised call summary for {name}.

Their context:
- Building: {building}
- Interests: {interests_str}

FULL CALL TRANSCRIPT:
{transcript_text}

Write a 100-120 word summary specifically for {name}, filtered to what's most relevant for them.
Mention:
- What was discussed that relates to their work
- Any bounties relevant to their skills
- People they should follow up with and why
- Any action items for them specifically

Be direct and personal. Use "you" not "{name}"."""

        per_person[name] = call_llm(personal_prompt, max_tokens=250)

    # --- Bounty list ---
    bounty_prompt = f"""From this call transcript, extract all bounties — tasks that were offered or requested.

TRANSCRIPT:
{transcript_text}

Return a JSON array. Each item: {{"title": str, "description": str, "claimer": str or null, "open": bool}}
Return ONLY the JSON array, no other text."""

    try:
        bounties = json.loads(call_llm(bounty_prompt, max_tokens=500))
    except Exception:
        bounties = session.bounties_detected

    # --- Action items ---
    action_prompt = f"""From this call transcript, list specific action items with owners.

TRANSCRIPT:
{transcript_text}

Return a JSON array. Each item: {{"action": str, "owner": str or null, "deadline": str or null}}
Return ONLY the JSON array."""

    try:
        action_items = json.loads(call_llm(action_prompt, max_tokens=400))
    except Exception:
        action_items = []

    return {
        "call_url": session.room_url,
        "duration_mins": duration_mins,
        "participants": list(session.participant_profiles.keys()),
        "global_summary": global_summary,
        "per_person": per_person,
        "bounties": bounties,
        "action_items": action_items,
        "raw_transcript": session.transcript,
        "generated_at": datetime.utcnow().isoformat(),
    }


# ── Daily API helpers ─────────────────────────────────────────────────────────

async def create_bot_token(room_url: str, http: aiohttp.ClientSession) -> str:
    """Create a Daily meeting token for Rizz (is_owner=True so he can transcribe)."""
    room_name = room_url.rstrip("/").split("/")[-1]
    resp = await http.post(
        "https://api.daily.co/v1/meeting-tokens",
        headers={"Authorization": f"Bearer {DAILY_API_KEY}", "Content-Type": "application/json"},
        json={
            "properties": {
                "room_name": room_name,
                "is_owner": True,
                "user_name": "Rizz",
                
                "enable_recording": "local",
                "auto_start_transcription": True,
            }
        },
    )
    data = await resp.json()
    if "token" not in data:
        raise RuntimeError(f"Failed to create token: {data}")
    return data["token"]


# ── Main bot ──────────────────────────────────────────────────────────────────

async def run_bot(room_url: str, token: Optional[str] = None):
    session = CallSession(room_url)

    async with aiohttp.ClientSession() as http:
        # Get a bot token if not provided
        if not token:
            token = await create_bot_token(room_url, http)
            logger.info("Bot token created")

        # Set up Daily transport — Rizz joins as a named participant
        transport = DailyTransport(
            room_url=room_url,
            token=token,
            bot_name="Rizz",
            params=DailyParams(
                audio_in_enabled=True,
                audio_out_enabled=True,
                transcription_enabled=True,
                vad_enabled=True,
                vad_analyzer=SileroVADAnalyzer(),
            ),
        )

        # STT — Groq Whisper large-v3 (free, high accuracy)
        from pipecat.services.groq.stt import GroqSTTService
        stt = GroqSTTService(
            api_key=GROQ_API_KEY,
            model="whisper-large-v3",
        )
        logger.info("Using Groq Whisper STT")

        # LLM — Groq Llama 3.3 70B for fast voice responses
        context = LLMContext(messages=[
            {"role": "system", "content": build_system_prompt(session)}
        ])

        context_aggregators = LLMContextAggregatorPair(context)

        llm = GroqLLMService(
            api_key=GROQ_API_KEY,
            model="llama-3.3-70b-versatile",
            settings=None,
        )

        # TTS — Groq TTS (Playai voices, low latency)
        tts = GroqTTSService(
            api_key=GROQ_API_KEY,
            voice="Celeste-PlayAI",  # warm, clear voice — swap as desired
            model="playai-tts",
        )

        # Build the pipeline:
        # mic input → STT → user aggregator → LLM → assistant aggregator → TTS → speaker output
        pipeline = Pipeline([
            transport.input(),           # audio from call participants
            stt,                         # speech → text
            context_aggregators.user(),  # add user turn to context
            llm,                         # Groq LLM response
            tts,                         # text → speech
            transport.output(),          # audio out to the call
            context_aggregators.assistant(),  # add Rizz's turn to context
        ])

        task = PipelineTask(
            pipeline,
            params=PipelineParams(allow_interruptions=True),
        )

        # ── Event handlers ────────────────────────────────────────────────────

        @transport.event_handler("on_joined")
        async def on_joined(transport, data):
            logger.info(f"Rizz joined the room")
            # Load profiles of anyone already in the call
            participants = data.get("participants", {})
            emails = []
            for pid, p in participants.items():
                email = (p.get("info") or {}).get("userName") or ""
                if "@" in email:
                    emails.append(email)

            if emails:
                profiles = await fetch_participant_profiles(http, emails)
                session.participant_profiles.update(profiles)
                # Refresh system prompt with loaded profiles
                context.messages[0] = {
                    "role": "system",
                    "content": build_system_prompt(session)
                }
                logger.info(f"Loaded {len(profiles)} profiles")

            # Rizz greets the call
            await task.queue_frame(LLMMessagesUpdateFrame(messages=[
                {"role": "user", "content": "Greet the call briefly — introduce yourself in one sentence."}
            ]))

        @transport.event_handler("on_participant_joined")
        async def on_participant_joined(transport, participant):
            name = participant.get("info", {}).get("userName", "someone")
            if name == "Rizz":
                return
            logger.info(f"Participant joined: {name}")

            # Try to load their profile
            email = participant.get("info", {}).get("userName", "")
            if "@" in email:
                profiles = await fetch_participant_profiles(http, [email])
                if profiles.get(email):
                    session.participant_profiles[name] = profiles[email]
                    context.messages[0] = {
                        "role": "system",
                        "content": build_system_prompt(session)
                    }

            # Rizz welcomes them
            await task.queue_frame(LLMMessagesUpdateFrame(messages=[
                {"role": "user", "content": f"Welcome {name} to the call warmly in one sentence. Reference what they're building if you know it."}
            ]))

        @transport.event_handler("on_participant_left")
        async def on_participant_left(transport, participant, reason):
            name = participant.get("info", {}).get("userName", "someone")
            logger.info(f"Participant left: {name}")

        @transport.event_handler("on_transcription_message")
        async def on_transcription(transport, message):
            """Capture transcription per speaker for session record and bounty detection."""
            text = message.get("text", "").strip()
            participant_id = message.get("participantId", "unknown")
            # Try to resolve name from participant info
            speaker = message.get("userName") or participant_id

            if not text:
                return

            entry = session.add_line(speaker, text)

            # Bounty detection
            bounty = detect_bounty(text, speaker)
            if bounty:
                session.bounties_detected.append(bounty)
                logger.info(f"🎯 Bounty detected: {text[:80]}")
                # Rizz acknowledges it
                await task.queue_frame(LLMMessagesUpdateFrame(messages=[
                    {"role": "user", "content": f"Someone just mentioned what sounds like a bounty: '{text}'. Acknowledge it briefly — one sentence."}
                ]))

        @transport.event_handler("on_call_ended")
        async def on_call_ended(transport):
            logger.info("Call ended — generating summaries...")
            summary = await generate_post_call_summary(session, GROQ_API_KEY)

            # Save summary to file
            ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            summary_path = f"call_summary_{ts}.json"
            with open(summary_path, "w") as f:
                json.dump(summary, f, indent=2)
            logger.info(f"Summary saved: {summary_path}")

            # Save recording if we have frames
            if session.recording_frames:
                session.save_recording(f"call_recording_{ts}.wav")

            # Push to Supabase if configured
            if SUPABASE_URL and SUPABASE_KEY:
                try:
                    async with aiohttp.ClientSession() as s:
                        await s.post(
                            f"{SUPABASE_URL}/rest/v1/call_summaries",
                            headers={
                                "apikey": SUPABASE_KEY,
                                "Authorization": f"Bearer {SUPABASE_KEY}",
                                "Content-Type": "application/json",
                                "Prefer": "return=minimal",
                            },
                            json=summary,
                        )
                    logger.info("Summary pushed to Supabase")
                except Exception as e:
                    logger.warning(f"Could not push to Supabase: {e}")

            await task.queue_frame(EndFrame())

        # ── Run ───────────────────────────────────────────────────────────────

        runner = PipelineRunner()
        await runner.run(task)

        return session


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Rizz — Resourceful call bot")
    parser.add_argument("--room",  required=True, help="Daily room URL")
    parser.add_argument("--token", default=None,  help="Daily meeting token (optional — will be created if not provided)")
    parser.add_argument("--output", default=".", help="Directory for recordings and summaries")
    args = parser.parse_args()

    os.makedirs(args.output, exist_ok=True)
    os.chdir(args.output)

    asyncio.run(run_bot(args.room, args.token))
