# Architecture map

**STATE: DRAFT. First pass for session 1.**

This map was produced by static introspection of the repository. It is the starting point for collaborative review. The final, labelled deliverable is produced together with Nick during the working sessions that make up Foundation Agreement Phase 1 Deliverable #1. Each node will be marked built / MVP / vision in those sessions.

## Diagram

```mermaid
graph LR
  subgraph External["External integrations"]
    ext_daily_co(["Daily.co"])
    ext_groq(["Groq"])
    ext_mistral(["Mistral"])
    ext_supabase(["Supabase"])
    ext_resend_email(["Resend (email)"])
    ext_pipecat_audio_pipeline(["Pipecat (audio pipeline)"])
  end
  subgraph Stores["Data stores"]
    store_supabase[("Supabase (Postgres + Auth)")]
  end
  subgraph Pages["Next.js pages"]
    page["Page /"]
    page_superuser["Page /superuser"]
    page_v2_room_id["Page /v2/room/[id]"]
  end
  subgraph APIs["Next.js API routes"]
    api_api_ai_chat[/"API /api/ai/chat"/]
    api_api_auth_get_history[/"API /api/auth/get-history"/]
    api_api_auth_save_history[/"API /api/auth/save-history"/]
    api_api_auth_send_magic_link[/"API /api/auth/send-magic-link"/]
    api_api_chat[/"API /api/chat"/]
    api_api_rizz_bot_start[/"API /api/rizz-bot/start"/]
    api_api_rizz_bot_stop[/"API /api/rizz-bot/stop"/]
    api_api_rizz_bot_summary[/"API /api/rizz-bot/summary"/]
    api_api_rizz_call_start[/"API /api/rizz-call/start"/]
    api_api_rizz_call_summary[/"API /api/rizz-call/summary"/]
    api_api_rizz_context[/"API /api/rizz/context"/]
    api_api_superuser_git_context[/"API /api/superuser/git-context"/]
    api_api_superuser_update_prompt[/"API /api/superuser/update-prompt"/]
    api_api_tts[/"API /api/tts"/]
  end
  subgraph Services["Standalone services"]
    svc_rizz_bot[["rizz-bot (Python)"]]
    svc_rizz_server[["rizz-server (Node)"]]
  end
  api_api_ai_chat --> ext_groq
  api_api_auth_get_history --> ext_supabase
  api_api_auth_get_history -->|read/write| store_supabase
  api_api_auth_save_history --> ext_supabase
  api_api_auth_save_history -->|read/write| store_supabase
  api_api_auth_send_magic_link --> ext_resend_email
  api_api_chat --> ext_supabase
  api_api_chat -->|read/write| store_supabase
  api_api_rizz_bot_start --> ext_supabase
  api_api_rizz_bot_start -->|spawn child process| svc_rizz_bot
  api_api_rizz_bot_summary --> ext_supabase
  api_api_rizz_bot_summary -->|read/write| store_supabase
  api_api_rizz_call_start -->|SSE / REST| svc_rizz_server
  api_api_rizz_call_summary --> ext_supabase
  api_api_rizz_call_summary -->|read/write| store_supabase
  api_api_rizz_call_summary -->|SSE / REST| svc_rizz_server
  api_api_rizz_context --> ext_supabase
  api_api_rizz_context -->|read/write| store_supabase
  api_api_tts --> ext_groq
  svc_rizz_bot --> ext_daily_co
  svc_rizz_bot --> ext_groq
  svc_rizz_bot --> ext_mistral
  svc_rizz_bot --> ext_supabase
  svc_rizz_bot --> ext_pipecat_audio_pipeline
  svc_rizz_bot -->|read/write| store_supabase
  svc_rizz_server --> ext_daily_co
  svc_rizz_server --> ext_groq
  svc_rizz_server --> ext_mistral
  svc_rizz_server --> ext_supabase
  svc_rizz_server -->|read/write| store_supabase
```

## Legend

- Rounded shapes are external integrations.
- Cylinder shapes are data stores.
- Rectangles are Next.js pages.
- Trapezoid shapes are Next.js API routes.
- Double-bordered shapes are standalone services.

**Counts:** 32 nodes, 30 edges.

## Internal modules

- `app`: Next.js app-router root (pages, API routes, layouts)
- `src/components`: React components (UI + feature)
- `src/lib`: Library code (rizz prompts, supabase client, helpers)
- `src/hooks`: React hooks
- `src/types`: TypeScript types (incl. database types)
- `public`: Static assets

## External integrations (with evidence)

- **Daily.co**
  - root: dep `@daily-co/daily-react`
  - env `DAILY_API_KEY` referenced in render.yaml
- **Groq**
  - root: dep `groq-sdk`
  - rizz-server: dep `groq-sdk`
  - rizz-bot: dep `groq`
  - env `GROQ_API_KEY` referenced in render.yaml
- **Mistral**
  - rizz-server: dep `@mistralai/mistralai`
  - rizz-bot: dep `mistralai`
  - env `MISTRAL_API_KEY` referenced in render.yaml
- **Supabase**
  - root: dep `@supabase/supabase-js`
  - rizz-server: dep `@supabase/supabase-js`
  - rizz-bot: dep `supabase`
  - env `SUPABASE_URL` referenced in render.yaml
  - env `SUPABASE_SERVICE_KEY` referenced in render.yaml
  - env `NEXT_PUBLIC_SUPABASE_URL` referenced in rizz-bot/bot.py
- **Resend (email)**
  - root: dep `resend`
- **Pipecat (audio pipeline)**
  - rizz-bot: dep `pipecat-ai`

## Data stores (with evidence)

- **Supabase (Postgres + Auth)**
  - `app/api/auth/get-history/route.ts`
  - `app/api/auth/save-history/route.ts`
  - `app/api/chat/route.ts`
  - `app/api/rizz-bot/summary/route.ts`
  - `app/api/rizz-call/summary/route.js`

## What we couldn't infer

These are fork points and gaps that the script could not classify with confidence. Nick will clarify in session 1.

- Page `Page /` (app/page.tsx) has no externals or stores referenced inline. It may route everything through child components, or it may be scaffold from create-next-app. Confirm with Nick.
- Page `Page /superuser` (app/superuser/page.tsx) has no externals or stores referenced inline. It may route everything through child components, or it may be scaffold from create-next-app. Confirm with Nick.
- Page `Page /v2/room/[id]` (app/v2/room/[id]/page.tsx) has no externals or stores referenced inline. It may route everything through child components, or it may be scaffold from create-next-app. Confirm with Nick.
- Fork point: rizz-bot and rizz-server both exist. Confirm whether they are one logical component or two with distinct ownership.
- Could not find a magic-link auth flow surface (UI page). Is it missing, lives under a different path, or handled inline in the room page?
- Could not find a invite acceptance flow surface (UI page). Is it missing, lives under a different path, or handled inline in the room page?
- Could not find a post-call summary surface (UI page). Is it missing, lives under a different path, or handled inline in the room page?

## How to refine this draft

See `.nexflow/architecture-map/README.md` for the session-1 workflow that turns this draft into the final, labelled architecture map.
