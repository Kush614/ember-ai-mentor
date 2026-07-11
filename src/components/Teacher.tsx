import { useEffect, useMemo, useRef, useState } from "react";
import { getConnectorEvents } from "../lib/backend";
import { loadMemories } from "../lib/memory";
import { LEARNER } from "../data/seed";
import { masteryToColor, palette } from "../theme";
import type { MemoryEntry } from "../types";

// One screen, two zones. A teacher has 90 seconds between classes —
// handoffs are the product; the Class Sky answers "who's stuck on what?"

interface Handoff {
  id: string;
  student: string;
  headline: string;
  question: string | null;
  video?: string; // data URL — the student asked on camera
  context: string;
  tip?: string;
}

const DISMISSED_KEY = "ember:teach:dismissed";

function readDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
  } catch {
    return [];
  }
}

function buildHandoffs(): Handoff[] {
  const list: Handoff[] = [];

  // Live Connector artifacts from Maya's session
  const events = getConnectorEvents(LEARNER.id);
  events.forEach((e: any, i: number) => {
    const card = e.card_json;
    if (!card || card.type !== "ask_teacher") return;
    list.push({
      id: `evt-${i}-${e.ts}`,
      student: "Maya R.",
      headline: card.video
        ? "Maya R. recorded a question for you"
        : "Maya R. wants to ask you about decimal conversion",
      question: card.handoff_artifact,
      video: card.video,
      context: "Struggled 3× tonight",
    });
  });

  // Seeded so the inbox reads true even before a live handoff fires
  if (!list.length) {
    list.push({
      id: "seed-maya",
      student: "Maya R.",
      headline: "Maya R. wants to ask you about decimal conversion",
      question:
        "How do I know when to divide vs move the point? I keep mixing up which number goes inside.",
      context: "Struggled 3× tonight",
    });
  }
  list.push({
    id: "seed-jordan",
    student: "Jordan K.",
    headline: "Jordan K. could use a hand with equivalent fractions",
    question: null,
    context: "Three shaky sessions this week",
    tip: "Maya just mastered this — pair them?",
  });

  return list;
}

export default function Teacher() {
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);
  const [handoffs] = useState<Handoff[]>(buildHandoffs);
  const visible = handoffs.filter((h) => !dismissed.includes(h.id));

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
  };

  return (
    <div className="min-h-full bg-morning text-ink">
      <header className="bg-deepnight text-[#E9EDF7] px-6 h-16 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="h-6 w-6 rounded-full shrink-0"
          style={{
            background: "radial-gradient(circle at 42% 38%, #FFC46B 0%, #FF9E4A 55%, #B4552D 100%)",
            boxShadow: "0 0 10px 2px rgba(255,158,74,0.4)",
          }}
        />
        <span className="font-display font-bold text-lg tracking-tight">Ember for Teachers</span>
        <span className="ml-auto font-data text-sm text-[#E9EDF7]/70">Ms. Rivera · Period 3 Math</span>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8 space-y-10">
        <section aria-labelledby="handoffs-h">
          <h2 id="handoffs-h" className="font-display font-bold text-2xl tracking-tight mb-4">
            Handoffs
          </h2>
          {visible.length === 0 ? (
            <p className="text-slate2 text-base rounded-card bg-cloud px-5 py-6">
              All caught up. Ember will send a student your way when a conversation calls for you.
            </p>
          ) : (
            <ul className="space-y-4">
              {visible.map((h) => (
                <HandoffCard key={h.id} h={h} onDone={() => dismiss(h.id)} />
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="sky-h">
          <h2 id="sky-h" className="font-display font-bold text-2xl tracking-tight mb-4">
            Class sky
          </h2>
          <ClassSky />
        </section>
      </main>
    </div>
  );
}

// ── Handoff card ───────────────────────────────────────────────────

function HandoffCard({ h, onDone }: { h: Handoff; onDone: () => void }) {
  const [folding, setFolding] = useState(false);

  const markTalked = () => {
    setFolding(true);
    setTimeout(onDone, 500);
  };

  return (
    <li
      className="rounded-card bg-white shadow-day p-5 overflow-hidden"
      style={{
        transition: "opacity 0.5s ease, transform 0.5s ease, max-height 0.5s ease",
        opacity: folding ? 0 : 1,
        transform: folding ? "scale(0.96) translateY(-6px)" : "none",
        maxHeight: folding ? 0 : 400,
      }}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="mt-1 text-goalgold text-lg leading-none">
          ⭐
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-lg leading-snug">{h.headline}</h3>
          {h.video && (
            <video src={h.video} controls className="mt-2 w-full max-w-[380px] rounded-card bg-deepnight" />
          )}
          {h.question && (
            <p className="mt-2 font-data text-[15px] text-ink/85 bg-cloud rounded-card px-4 py-3 leading-relaxed">
              "{h.question}"
            </p>
          )}
          <p className="mt-2 text-sm text-slate2">
            {h.context}
            {h.tip && (
              <>
                {" · "}
                <span className="text-ink">Tip: {h.tip}</span>
              </>
            )}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={markTalked}
              className="h-11 rounded-full bg-moss/15 text-[#2E6B52] font-bold px-5 text-base hover:bg-moss/25 transition"
            >
              {folding ? "✓" : "Mark as talked ✓"}
            </button>
            <button
              onClick={onDone}
              className="h-11 rounded-full border border-ink/10 px-5 text-base text-slate2 hover:bg-cloud transition"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

// ── Class sky (read-only constellation) ────────────────────────────

interface ClassConcept {
  key: string;
  label: string;
  students: { name: string; mastery: number }[];
}

const CLASSMATES: Record<string, { name: string; mastery: number }[]> = {
  "fractions.equivalent": [
    { name: "Jordan K.", mastery: 0.3 },
    { name: "Priya S.", mastery: 0.8 },
    { name: "Leo M.", mastery: 0.65 },
  ],
  "fractions.add_unlike": [
    { name: "Priya S.", mastery: 0.7 },
    { name: "Leo M.", mastery: 0.45 },
  ],
  "decimals.convert": [
    { name: "Jordan K.", mastery: 0.5 },
    { name: "Priya S.", mastery: 0.55 },
  ],
  "fractions.word_problems": [{ name: "Leo M.", mastery: 0.25 }],
  "integers.negatives": [
    { name: "Jordan K.", mastery: 0.85 },
    { name: "Priya S.", mastery: 0.9 },
    { name: "Leo M.", mastery: 0.8 },
  ],
};

function ClassSky() {
  const [concepts, setConcepts] = useState<ClassConcept[]>([]);
  const [selected, setSelected] = useState<ClassConcept | null>(null);

  useEffect(() => {
    loadMemories(LEARNER.id).then((entries: MemoryEntry[]) => {
      const list: ClassConcept[] = [];
      for (const e of entries) {
        if (e.type !== "concept") continue;
        const others = CLASSMATES[e.key] || [];
        list.push({
          key: e.key,
          label: e.data.label,
          students: [{ name: "Maya R.", mastery: e.data.mastery ?? 0 }, ...others],
        });
      }
      setConcepts(list);
    });
  }, []);

  // deterministic scatter layout — no simulation needed for a read-only card
  const placed = useMemo(() => {
    const W = 640;
    const H = 300;
    const slots = [
      [0.16, 0.34],
      [0.5, 0.68],
      [0.62, 0.24],
      [0.85, 0.55],
      [0.27, 0.78],
      [0.78, 0.84],
    ];
    return concepts.map((c, i) => {
      const [fx, fy] = slots[i % slots.length];
      const avg = c.students.reduce((s, st) => s + st.mastery, 0) / (c.students.length || 1);
      return { ...c, x: fx * W, y: fy * H, r: 10 + c.students.length * 5, avg };
    });
  }, [concepts]);

  return (
    <div className="rounded-card overflow-hidden field-vignette shadow-day">
      <svg viewBox="0 0 640 300" className="w-full block" role="img" aria-label="Class constellation of concepts">
        {placed.map((c) => {
          const color = masteryToColor(c.avg);
          const isSel = selected?.key === c.key;
          return (
            <g key={c.key} transform={`translate(${c.x},${c.y})`}>
              <g
                tabIndex={0}
                role="button"
                aria-label={`${c.label}, ${c.students.length} students, class average ${Math.round(c.avg * 100)} percent`}
                onClick={() => setSelected(isSel ? null : c)}
                onKeyDown={(e) => e.key === "Enter" && setSelected(isSel ? null : c)}
                style={{ cursor: "pointer", filter: `drop-shadow(0 0 8px ${color})` }}
              >
                <circle r={c.r} fill={color} fillOpacity={isSel ? 0.7 : 0.45} />
                <circle r={c.r * 0.5} fill={palette.emberhot} />
              </g>
              <text
                textAnchor="middle"
                y={c.r + 15}
                fontSize={11}
                fill="#E9EDF7"
                fillOpacity={0.85}
                fontFamily='"Space Grotesk", monospace'
                style={{ pointerEvents: "none" }}
              >
                {c.label.length > 26 ? c.label.slice(0, 24) + "…" : c.label}
              </text>
            </g>
          );
        })}
      </svg>

      {selected && (
        <div className="bg-deepnight px-5 py-4 border-t border-[#E9EDF7]/10">
          <div className="font-display font-bold text-[#E9EDF7] text-base mb-2">{selected.label}</div>
          <ul className="space-y-1.5">
            {[...selected.students]
              .sort((a, b) => b.mastery - a.mastery)
              .map((s) => (
                <li key={s.name} className="flex items-center gap-2.5 font-data text-sm text-[#E9EDF7]/85">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{
                      background: masteryToColor(s.mastery),
                      boxShadow: `0 0 6px ${masteryToColor(s.mastery)}`,
                    }}
                  />
                  <span className="flex-1">{s.name}</span>
                  <span className="text-[#E9EDF7]/55">
                    {s.mastery >= 0.75 ? "glowing" : s.mastery >= 0.35 ? "catching" : "flickering"}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
