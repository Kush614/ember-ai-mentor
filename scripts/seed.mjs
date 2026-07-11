// Provision Maya's memory (sessions 001–004) into EverOS.
// - With no EverOS creds: prints the seed so you can eyeball it.
// - With VITE_EVEROS_BASE_URL + VITE_EVEROS_API_KEY: POSTs each entry.
// The web app also auto-seeds a local mirror on first login, so the demo
// works even if this never runs against prod.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// read .env manually (no dep)
const env = {};
try {
  for (const line of fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
} catch {}

const BASE = env.VITE_EVEROS_BASE_URL || "";
const KEY = env.VITE_EVEROS_API_KEY || "";

// Minimal mirror of src/data/seed.ts (kept small on purpose).
const LEARNER = "maya-r-7g";
const entries = [
  { type: "concept", key: "fractions.equivalent", data: { label: "Equivalent fractions", mastery: 0.85, best_modality: "soccer analogies" }, confidence: 0.9 },
  { type: "concept", key: "fractions.add_unlike", data: { label: "Adding unlike fractions", mastery: 0.55, last_error_type: "forgets common denominator" }, confidence: 0.7 },
  { type: "concept", key: "fractions.word_problems", data: { label: "Fraction word problems", mastery: 0.3 }, confidence: 0.6 },
  { type: "concept", key: "decimals.convert", data: { label: "Fraction ↔ decimal conversion", mastery: 0.2 }, confidence: 0.55 },
  { type: "concept", key: "integers.negatives", data: { label: "Negative numbers", mastery: 0.9, decaying: true }, confidence: 0.9 },
  { type: "person", key: "ms-rivera", data: { name: "Ms. Rivera", role: "math teacher", context: "Maya trusts her; has asked her for help before" }, confidence: 0.95 },
  { type: "person", key: "jordan", data: { name: "Jordan", role: "classmate", context: "Struggling with equivalent fractions" }, confidence: 0.7 },
  { type: "person", key: "mom", data: { name: "Mom", role: "parent", context: "Checks in on quiz results" }, confidence: 0.8 },
  { type: "goal", key: "thursday-quiz", data: { label: "Pass Thursday fractions quiz", status: "progress", target_date: "2026-07-09" }, confidence: 0.9 },
  { type: "goal", key: "math-team", data: { label: "Make math team tryouts in fall", status: "progress" }, confidence: 0.6 },
  { type: "pattern", key: "soccer-analogies", data: { label: "Learns best with soccer analogies", strength: 0.9 }, confidence: 0.9 },
  { type: "pattern", key: "night-frustration", data: { label: "Frustration spikes after 8 PM", strength: 0.7 }, confidence: 0.7 },
];

if (!BASE || !KEY) {
  console.log(`\n[seed] No EverOS creds in .env — dry run.\n[seed] Would write ${entries.length} memories for ${LEARNER}:\n`);
  for (const e of entries) console.log(`  ${e.type.padEnd(8)} ${e.key}`);
  console.log(`\n[seed] The web app auto-seeds a local mirror on first login, so the demo is ready regardless.\n`);
  process.exit(0);
}

console.log(`[seed] Writing ${entries.length} memories to EverOS at ${BASE} …`);
for (const e of entries) {
  const body = { learner_id: LEARNER, id: `${e.type}:${e.key}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), source_session: "sess_004", ...e };
  const res = await fetch(`${BASE}/memories`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
    body: JSON.stringify(body),
  });
  console.log(`  ${res.ok ? "✓" : "✗ " + res.status} ${e.key}`);
}
console.log("[seed] Done.");
