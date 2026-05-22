import { Response } from 'express';

export type TranscriptLine = {
  ts: string;
  speaker: string;
  text: string;
};

export type BountyItem = {
  text: string;
  speaker: string;
  claimer: string | null;
  claimed: boolean;
  ts: string;
};

export class CallSession {
  roomId: string;
  roomUrl: string;
  startedAt: Date;
  transcript: TranscriptLine[] = [];
  bounties: BountyItem[] = [];
  sseListeners: Set<Response> = new Set();

  constructor(roomUrl: string) {
    this.roomUrl = roomUrl;
    const cleaned = roomUrl.replace(/\/$/, '');
    this.roomId = cleaned.split('/').pop() || cleaned;
    this.startedAt = new Date();
  }

  addLine(speaker: string, text: string): TranscriptLine {
    const line: TranscriptLine = {
      ts: new Date().toISOString(),
      speaker,
      text,
    };
    this.transcript.push(line);
    return line;
  }

  addBounty(bounty: BountyItem): void {
    this.bounties.push(bounty);
  }

  emit(type: string, payload: any): void {
    const data = JSON.stringify({ type, payload });
    const msg = `data: ${data}\n\n`;
    const toRemove: Response[] = [];

    this.sseListeners.forEach((res) => {
      if (res.writableEnded || res.destroyed) {
        toRemove.push(res);
      } else {
        try {
          res.write(msg);
        } catch {
          toRemove.push(res);
        }
      }
    });

    toRemove.forEach((r) => this.sseListeners.delete(r));
  }

  addListener(res: Response): void {
    this.sseListeners.add(res);
  }

  removeListener(res: Response): void {
    this.sseListeners.delete(res);
  }
}

const sessions = new Map<string, CallSession>();

export function createSession(roomUrl: string): CallSession {
  const session = new CallSession(roomUrl);
  sessions.set(session.roomId, session);
  return session;
}

export function getSession(roomId: string): CallSession | undefined {
  return sessions.get(roomId);
}

export function getSessionByRoomName(roomName: string): CallSession | undefined {
  return sessions.get(roomName);
}

export function deleteSession(roomId: string): void {
  sessions.delete(roomId);
}
