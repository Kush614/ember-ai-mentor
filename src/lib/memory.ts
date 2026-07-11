// ── EverOS memory adapter ─────────────────────────────────────────
// ALL learner-memory I/O funnels through this file (SPEC risk register).
// Swap the internals for the real EverOS SDK/REST without touching agents.

import { config, memoryMode } from "./config";
import type { MemoryEntry } from "../types";
import { LEARNER } from "../data/seed";
import { getStudent, buildStudentEntries } from "../data/students";

const LS_KEY = (learnerId: string) => `ember:mem:${learnerId}`;
const NOW = () => new Date().toISOString();

// ── Mock store (localStorage, seeded) ─────────────────────────────

function mockLoad(learnerId: string): MemoryEntry[] {
  const raw = localStorage.getItem(LS_KEY(learnerId));
  if (raw) {
    try {
      return JSON.parse(raw) as MemoryEntry[];
    } catch {
      /* fall through to seed */
    }
  }
  const spec = getStudent(learnerId);
  const seeded = spec ? buildStudentEntries(spec) : [];
  localStorage.setItem(LS_KEY(learnerId), JSON.stringify(seeded));
  return seeded;
}

function mockSave(learnerId: string, entries: MemoryEntry[]) {
  localStorage.setItem(LS_KEY(learnerId), JSON.stringify(entries));
}

// ── Real EverOS (REST; adjust to actual API when creds land) ───────

async function everosLoad(learnerId: string): Promise<MemoryEntry[]> {
  const res = await fetch(`${config.everosBaseUrl}/memories?learner_id=${learnerId}`, {
    headers: { authorization: `Bearer ${config.everosKey}` },
  });
  if (!res.ok) throw new Error(`EverOS load ${res.status}`);
  const j = await res.json();
  return (j.memories || j.data || j) as MemoryEntry[];
}

async function everosUpsert(entry: MemoryEntry): Promise<void> {
  const res = await fetch(`${config.everosBaseUrl}/memories`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.everosKey}`,
    },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error(`EverOS upsert ${res.status}`);
}

// ── Public API ────────────────────────────────────────────────────

export async function loadMemories(learnerId: string): Promise<MemoryEntry[]> {
  if (memoryMode === "everos") {
    try {
      return await everosLoad(learnerId);
    } catch (e) {
      console.warn("[Ember] EverOS load failed, using local mock:", e);
    }
  }
  return mockLoad(learnerId);
}

export async function upsertMemory(
  learnerId: string,
  entry: MemoryEntry
): Promise<void> {
  // keep local mirror in sync regardless of backend (fast Canvas reads)
  const entries = mockLoad(learnerId);
  const idx = entries.findIndex((e) => e.id === entry.id);
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);
  mockSave(learnerId, entries);

  if (memoryMode === "everos") {
    try {
      await everosUpsert(entry);
    } catch (e) {
      console.warn("[Ember] EverOS upsert failed (local mirror kept):", e);
    }
  }
}

export function makeEntry(
  learnerId: string,
  partial: Omit<MemoryEntry, "learner_id" | "created_at" | "updated_at">
): MemoryEntry {
  return {
    learner_id: learnerId,
    created_at: NOW(),
    updated_at: NOW(),
    ...partial,
  };
}

export function resetLearner(learnerId: string) {
  localStorage.removeItem(LS_KEY(learnerId));
}

export { NOW };
