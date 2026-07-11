// ── Butterbase backend adapter ────────────────────────────────────
// Stores transcripts + connector_events via the Butterbase Data API,
// authenticated with the signed-in user's JWT (RLS-scoped) and falling
// back to a bb_sk service key. Local mirror by default / always kept in sync.

import { config, backendMode } from "./config";
import { getAccessToken } from "./auth";
import type { ChatMessage, ConnectorCard } from "../types";

const T_KEY = (learnerId: string) => `ember:transcripts:${learnerId}`;
const C_KEY = (learnerId: string) => `ember:connector_events:${learnerId}`;

/** Bearer token for Data API writes: prefer the user JWT, else the service key. */
async function bearer(): Promise<string | null> {
  const jwt = await getAccessToken();
  return jwt || config.butterbaseKey || null;
}

async function insert(table: string, row: Record<string, any>) {
  if (backendMode !== "butterbase") return;
  const token = await bearer();
  if (!token) return;
  try {
    const res = await fetch(`${config.butterbaseUrl}/${table}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(row),
    });
    if (!res.ok) console.warn(`[Ember] Butterbase ${table} insert → ${res.status}`);
  } catch (e) {
    console.warn(`[Ember] Butterbase ${table} insert failed:`, e);
  }
}

export async function saveTranscript(learnerId: string, sessionId: string, msg: ChatMessage) {
  const row = { learner_id: learnerId, session_id: sessionId, role: msg.role, content: msg.content, ts: msg.ts };
  const list = readLS(T_KEY(learnerId));
  list.push(row);
  writeLS(T_KEY(learnerId), list);
  await insert("transcripts", row);
}

export async function logConnectorEvent(learnerId: string, rule: string, card: ConnectorCard) {
  const row = { learner_id: learnerId, rule_fired: rule, card_json: card, ts: new Date().toISOString() };
  const list = readLS(C_KEY(learnerId));
  list.push(row);
  writeLS(C_KEY(learnerId), list);
  await insert("connector_events", row);
}

export function getConnectorEvents(learnerId: string): any[] {
  return readLS(C_KEY(learnerId));
}

/** Attach a student-recorded video to the most recent connector event. */
export function attachVideoToLastEvent(learnerId: string, videoDataUrl: string) {
  const list = readLS(C_KEY(learnerId));
  if (!list.length) return;
  list[list.length - 1].card_json = { ...list[list.length - 1].card_json, video: videoDataUrl };
  try {
    writeLS(C_KEY(learnerId), list);
  } catch (e) {
    console.warn("[Ember] video too large for local storage, kept in-session only:", e);
  }
}

export function resetBackend(learnerId: string) {
  localStorage.removeItem(T_KEY(learnerId));
  localStorage.removeItem(C_KEY(learnerId));
}

function readLS(k: string): any[] {
  try {
    return JSON.parse(localStorage.getItem(k) || "[]");
  } catch {
    return [];
  }
}
function writeLS(k: string, v: any[]) {
  localStorage.setItem(k, JSON.stringify(v));
}
