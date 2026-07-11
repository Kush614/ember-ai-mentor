// ── EverOS episodic-memory client ─────────────────────────────────
// Talks to the Butterbase `everos` function (which holds the API key
// server-side), so the browser never sees the EverOS key and there's no
// CORS problem. This is Ember's real long-term memory: every exchange is
// ingested, and relevant past episodes are recalled into the Mentor's
// memory digest.

import { config } from "./config";

const FN_URL = config.butterbaseUrl ? `${config.butterbaseUrl}/fn/everos` : "";
export const everosEnabled = !!FN_URL;

export interface Episode {
  id: string;
  summary: string;
  subject: string;
  timestamp?: string | number;
}

async function call(op: string, payload: Record<string, any>, timeoutMs = 8000): Promise<any> {
  if (!FN_URL) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(FN_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op, ...payload }),
      signal: ctrl.signal,
    });
    return await res.json();
  } catch (e) {
    console.warn(`[Ember] EverOS ${op} failed:`, e);
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Fire-and-forget: store one exchange for future recall. */
export function ingestExchange(userId: string, sessionId: string, userMsg: string, assistantMsg: string) {
  const now = Date.now();
  void call("ingest", {
    user_id: userId,
    session_id: sessionId,
    messages: [
      { role: "user", timestamp: now, content: userMsg },
      { role: "assistant", timestamp: now, content: assistantMsg },
    ],
  });
}

export interface Recalled {
  episodes: Episode[];
  profiles: string[]; // extracted profile facts (embed_text)
}

/** Semantic recall of past memory. Short timeout so it never stalls chat. */
export async function recall(userId: string, query: string, topK = 4): Promise<Recalled> {
  const d = await call("recall", { user_id: userId, query, top_k: topK }, 2500);
  const episodes = (d?.episodes || []) as Episode[];
  const profiles = ((d?.profiles || []) as any[])
    .map((p) => p?.profile_data?.embed_text || p?.embed_text || "")
    .filter(Boolean);
  return { episodes, profiles };
}

export function flush(userId: string) {
  return call("flush", { user_id: userId });
}

export interface MemoryFact {
  category: string;
  description: string;
  evidence: string;
  updated_at?: string | null;
}

/** Everything EverOS has stored for a learner — for the Memory Reveal. */
export async function dumpMemory(userId: string): Promise<{ episodes: Episode[]; facts: MemoryFact[] }> {
  const d = await call("dump", { user_id: userId }, 7000);
  return { episodes: (d?.episodes || []) as Episode[], facts: (d?.facts || []) as MemoryFact[] };
}

/** Render recalled memory as a digest section for the Mentor prompt. */
export function formatRecall(r: Recalled): string {
  const lines: string[] = [];
  for (const p of r.profiles.slice(0, 5)) lines.push(`- ${p}`.replace(/\s+/g, " ").slice(0, 200));
  for (const e of r.episodes.slice(0, 3)) lines.push(`- ${e.summary}`.replace(/\s+/g, " ").slice(0, 240));
  if (!lines.length) return "";
  return `\nWHAT YOU RECALL FROM PAST SESSIONS (EverOS memory):\n${lines.join("\n")}`;
}
