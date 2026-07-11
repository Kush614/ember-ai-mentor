import type { MemoryEntry } from "../types";

// Compact memory digest for the Mentor system prompt (~<400 tokens).
// Ranks by recency × confidence, groups by type.
export function buildDigest(entries: MemoryEntry[]): string {
  const score = (e: MemoryEntry) => {
    const days = daysSince(e.updated_at);
    const recency = Math.exp(-days / 21); // ~3 week half-life
    return e.confidence * (0.4 + 0.6 * recency);
  };

  const byType = (t: string) =>
    entries
      .filter((e) => e.type === t)
      .sort((a, b) => score(b) - score(a));

  const lines: string[] = [];

  const concepts = byType("concept").slice(0, 6);
  if (concepts.length) {
    lines.push("CONCEPTS:");
    for (const c of concepts) {
      const d = c.data;
      const level = d.mastery >= 0.75 ? "strong" : d.mastery >= 0.35 ? "developing" : "shaky";
      const bits = [`${pct(d.mastery)} (${level})`];
      if (d.last_error_type) bits.push(`common slip: ${d.last_error_type}`);
      if (d.decaying) bits.push("hasn't practiced in a while — may be fading");
      lines.push(`- ${d.label}: ${bits.join("; ")}`);
    }
  }

  const patterns = byType("pattern");
  if (patterns.length) {
    lines.push("HOW THEY LEARN:");
    for (const p of patterns) lines.push(`- ${p.data.label}`);
  }

  const people = byType("person");
  if (people.length) {
    lines.push("PEOPLE IN THEIR CORNER:");
    for (const p of people) lines.push(`- ${p.data.name} (${p.data.role}): ${p.data.context}`);
  }

  const goals = byType("goal");
  if (goals.length) {
    lines.push("GOALS:");
    for (const g of goals) lines.push(`- ${g.data.label} [${g.data.status}]`);
  }

  const sessions = byType("session").slice(0, 2);
  if (sessions.length) {
    lines.push("RECENT SESSIONS:");
    for (const s of sessions) lines.push(`- ${s.data.summary}`);
  }

  return lines.join("\n");
}

export function bestModality(entries: MemoryEntry[]): string {
  const p = entries
    .filter((e) => e.type === "pattern")
    .sort((a, b) => (b.data.strength || 0) - (a.data.strength || 0))[0];
  return p?.data.label || "concrete, real-world analogies";
}

function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  const now = Date.now();
  return Math.max(0, (now - then) / 86400000);
}
function pct(n: number): string {
  return `${Math.round((n || 0) * 100)}% mastery`;
}
