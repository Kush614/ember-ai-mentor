// ── Connector rule engine (deterministic — checked in code, not vibes) ──
import type { MemoryEntry, ObserverResult, ConnectorType } from "../types";
import { PEERS } from "../data/seed";

export interface FiredRule {
  rule: string;
  ruleContext: string;
  type: ConnectorType;
  focus_person?: string; // person memory key to pulse
  focus_concept?: string;
}

export interface SessionTracker {
  failuresByConcept: Record<string, number>;
  frustrationLast2: number[]; // most recent last
  masteredThisSession: string[]; // concept keys that crossed >= 0.75
  firedRules: string[]; // dedupe keys
}

export function emptyTracker(): SessionTracker {
  return { failuresByConcept: {}, frustrationLast2: [], masteredThisSession: [], firedRules: [] };
}

const personKeyByRole = (entries: MemoryEntry[], role: string) =>
  entries.find((e) => e.type === "person" && e.data.role === role)?.key;

const personKeyHelpingWith = (entries: MemoryEntry[], conceptKey: string) =>
  entries.find(
    (e) => e.type === "person" && Array.isArray(e.data.helps_with) && e.data.helps_with.includes(conceptKey)
  )?.key;

const conceptLabel = (entries: MemoryEntry[], key: string) =>
  entries.find((e) => e.type === "concept" && e.key === key)?.data.label || key;

// Rules 1–3: evaluated after each exchange.
export function checkExchangeRules(
  tracker: SessionTracker,
  entries: MemoryEntry[],
  observer: ObserverResult
): FiredRule | null {
  // Rule 1 — 3 failed attempts on one concept this session
  for (const [key, count] of Object.entries(tracker.failuresByConcept)) {
    const fp = `ask_teacher:${key}`;
    if (count >= 3 && !tracker.firedRules.includes(fp)) {
      tracker.firedRules.push(fp);
      const teacherKey = personKeyHelpingWith(entries, key) || personKeyByRole(entries, "math teacher");
      return {
        rule: "3 failed attempts on one concept",
        ruleContext: `The student has tried "${conceptLabel(entries, key)}" ${count} times this session without it clicking. A patient human explanation will help more than another AI attempt.`,
        type: "ask_teacher",
        focus_person: teacherKey,
        focus_concept: key,
      };
    }
  }

  // Rule 2 — frustration >= 0.7 two exchanges in a row
  const f = tracker.frustrationLast2;
  const fp2 = "take_break:streak";
  if (f.length >= 2 && f[f.length - 1] >= 0.7 && f[f.length - 2] >= 0.7 && !tracker.firedRules.includes(fp2)) {
    tracker.firedRules.push(fp2);
    return {
      rule: "frustration spike (two exchanges)",
      ruleContext:
        "The student's frustration has stayed high across two exchanges. The right move is a break and a supportive human check-in, not more problems.",
      type: "take_break",
      focus_person: personKeyByRole(entries, "parent"),
    };
  }

  // Rule 3 — peer-match: mastered a concept a classmate struggles with
  for (const key of tracker.masteredThisSession) {
    const peer = PEERS.find((p) => p.struggling.includes(key));
    const fp3 = `help_peer:${key}`;
    if (peer && !tracker.firedRules.includes(fp3)) {
      tracker.firedRules.push(fp3);
      return {
        rule: "peer-match",
        ruleContext: `The student is now strong at "${conceptLabel(entries, key)}", which classmate ${peer.name} is currently struggling with. Teaching it back deepens mastery and builds connection.`,
        type: "help_peer",
        focus_person: entries.find((e) => e.type === "person" && e.data.name === peer.name)?.key,
        focus_concept: key,
      };
    }
  }

  return null;
}

// Rule 4 — decay: mastered concept untouched > 7 days (checked at session start).
export function checkDecayRule(tracker: SessionTracker, entries: MemoryEntry[]): FiredRule | null {
  const fp = "review_nudge:decay";
  if (tracker.firedRules.includes(fp)) return null;
  for (const e of entries) {
    if (e.type !== "concept") continue;
    const mastered = (e.data.mastery || 0) >= 0.75;
    const stale = daysSince(e.updated_at) > 7 || e.data.decaying;
    if (mastered && stale) {
      tracker.firedRules.push(fp);
      return {
        rule: "decay (untouched > 7 days)",
        ruleContext: `"${e.data.label}" was mastered but hasn't been touched in over a week. A gentle, specific review nudge referencing when they first learned it keeps it from fading.`,
        type: "review_nudge",
        focus_concept: e.key,
      };
    }
  }
  return null;
}

// Record the effect of one exchange on the session tracker.
export function updateTracker(tracker: SessionTracker, observer: ObserverResult, priorMastery: Record<string, number>) {
  tracker.frustrationLast2 = [...tracker.frustrationLast2, observer.frustration].slice(-2);
  for (const cu of observer.concept_updates) {
    const failed = cu.mastery_delta < 0 || !!cu.error_type;
    if (failed) tracker.failuresByConcept[cu.key] = (tracker.failuresByConcept[cu.key] || 0) + 1;
    const before = priorMastery[cu.key] ?? 0;
    const after = clamp01(before + 0.3 * cu.mastery_delta);
    if (before < 0.75 && after >= 0.75 && !tracker.masteredThisSession.includes(cu.key))
      tracker.masteredThisSession.push(cu.key);
  }
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}
function daysSince(iso: string): number {
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / 86400000);
}
