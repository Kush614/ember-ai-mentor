import type { MemoryEntry } from "../types";

export const LEARNER = {
  id: "maya-r-7g",
  display_name: "Maya",
  grade: "7th grade",
};

// Classmate profiles (other seeded learners) used by the peer-match rule.
export const PEERS: { name: string; struggling: string[]; concept_label: string }[] =
  [{ name: "Jordan", struggling: ["fractions.equivalent"], concept_label: "Equivalent fractions" }];

const now = "2026-07-11T11:20:00Z";

function entry(e: Partial<MemoryEntry> & Pick<MemoryEntry, "type" | "key" | "data" | "confidence">): MemoryEntry {
  return {
    id: `${e.type}:${e.key}`,
    learner_id: LEARNER.id,
    created_at: e.created_at ?? "2026-07-01T00:00:00Z",
    updated_at: e.updated_at ?? "2026-07-08T00:00:00Z",
    source_session: e.source_session ?? "sess_004",
    ...e,
  } as MemoryEntry;
}

// Session 005 is the live demo. Everything below is pre-loaded history.
export function seedMemories(): MemoryEntry[] {
  return [
    // ── concepts ──
    entry({
      type: "concept",
      key: "fractions.equivalent",
      confidence: 0.9,
      updated_at: "2026-07-06T19:30:00Z",
      source_session: "sess_003",
      data: {
        label: "Equivalent fractions",
        mastery: 0.85,
        attempts: 6,
        best_modality: "soccer analogies",
        last_error_type: "cross-multiplication mixup",
        decaying: false,
      },
    }),
    entry({
      type: "concept",
      key: "fractions.add_unlike",
      confidence: 0.7,
      updated_at: "2026-07-07T18:00:00Z",
      data: {
        label: "Adding unlike fractions",
        mastery: 0.55,
        attempts: 4,
        last_error_type: "forgets common denominator",
        prereqs: ["fractions.equivalent"],
      },
    }),
    entry({
      type: "concept",
      key: "fractions.word_problems",
      confidence: 0.6,
      data: {
        label: "Fraction word problems",
        mastery: 0.3,
        attempts: 3,
        prereqs: ["fractions.add_unlike"],
      },
    }),
    entry({
      type: "concept",
      key: "decimals.convert",
      confidence: 0.55,
      updated_at: "2026-07-08T20:15:00Z",
      data: {
        label: "Fraction ↔ decimal conversion",
        mastery: 0.2,
        attempts: 2,
        prereqs: ["fractions.equivalent"],
      },
    }),
    entry({
      type: "concept",
      key: "integers.negatives",
      confidence: 0.9,
      updated_at: "2026-07-02T17:00:00Z",
      source_session: "sess_001",
      data: {
        label: "Negative numbers",
        mastery: 0.9,
        attempts: 5,
        decaying: true,
      },
    }),

    // ── people ──
    entry({
      type: "person",
      key: "ms-rivera",
      confidence: 0.95,
      data: {
        name: "Ms. Rivera",
        role: "math teacher",
        context: "Maya trusts her; has asked her for help before",
        helps_with: ["decimals.convert", "fractions.word_problems"],
      },
    }),
    entry({
      type: "person",
      key: "jordan",
      confidence: 0.7,
      data: {
        name: "Jordan",
        role: "classmate",
        context: "Struggling with equivalent fractions — Maya's strength",
        helps_with: ["fractions.equivalent"],
      },
    }),
    entry({
      type: "person",
      key: "mom",
      confidence: 0.8,
      data: {
        name: "Mom",
        role: "parent",
        context: "Checks in on quiz results",
      },
    }),

    // ── goals ──
    entry({
      type: "goal",
      key: "thursday-quiz",
      confidence: 0.9,
      updated_at: "2026-07-08T21:00:00Z",
      data: {
        label: "Pass Thursday fractions quiz",
        status: "progress",
        target_date: "2026-07-09",
        concept_keys: ["fractions.add_unlike", "fractions.equivalent"],
      },
    }),
    entry({
      type: "goal",
      key: "math-team",
      confidence: 0.6,
      data: {
        label: "Make math team tryouts in fall",
        status: "progress",
        concept_keys: ["decimals.convert"],
      },
    }),

    // ── patterns ──
    entry({
      type: "pattern",
      key: "soccer-analogies",
      confidence: 0.9,
      data: { label: "Learns best with soccer analogies", strength: 0.9 },
    }),
    entry({
      type: "pattern",
      key: "night-frustration",
      confidence: 0.7,
      data: { label: "Frustration spikes after 8 PM", strength: 0.7 },
    }),

    // ── sessions ──
    entry({
      type: "session",
      key: "sess_001",
      confidence: 1,
      created_at: "2026-07-02T17:00:00Z",
      updated_at: "2026-07-02T17:25:00Z",
      source_session: "sess_001",
      data: { summary: "Reviewed negative numbers; solid and confident.", duration_min: 25 },
    }),
    entry({
      type: "session",
      key: "sess_002",
      confidence: 1,
      created_at: "2026-07-04T20:30:00Z",
      updated_at: "2026-07-04T20:55:00Z",
      source_session: "sess_002",
      data: {
        summary: "Adding unlike fractions — late session, frustration crept in after 8 PM.",
        duration_min: 25,
      },
    }),
    entry({
      type: "session",
      key: "sess_003",
      confidence: 1,
      created_at: "2026-07-06T19:00:00Z",
      updated_at: "2026-07-06T19:30:00Z",
      source_session: "sess_003",
      data: {
        summary:
          "Breakthrough on equivalent fractions using a soccer-team ratio analogy — mood lifted noticeably.",
        duration_min: 30,
      },
    }),
    entry({
      type: "session",
      key: "sess_004",
      confidence: 1,
      created_at: "2026-07-08T20:00:00Z",
      updated_at: "2026-07-08T20:25:00Z",
      source_session: "sess_004",
      data: {
        summary: "Pre-quiz nerves about Thursday's fractions quiz; practiced adding unlike fractions.",
        duration_min: 25,
      },
    }),
  ];
}

export const SESSION_ID = "sess_005";
