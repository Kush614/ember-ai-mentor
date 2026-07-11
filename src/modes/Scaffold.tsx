import { useEffect, useState } from "react";
import { ModeShell, Spinner, everosScope } from "./shared";
import { completeJSON } from "../lib/llm";
import { recall, ingestExchange, type Recalled } from "../lib/everos";

interface Tier {
  level: string;
  summary: string;
  activity: string;
  supports: string[];
}
interface Lesson {
  tiers: Tier[];
  exit_tickets: { tier: string; question: string }[];
}

const SYSTEM = `You are Scaffold, an expert instructional coach for K-12 teachers. Given a lesson objective, produce a differentiated lesson at three tiers for a mixed-skill class. Respond ONLY with JSON matching:
{
  "tiers": [
    {"level":"Below grade level","summary":"1 sentence","activity":"2-3 sentences the teacher can run","supports":["scaffold","scaffold"]},
    {"level":"At grade level","summary":"","activity":"","supports":[]},
    {"level":"Above grade level (extension)","summary":"","activity":"","supports":[]}
  ],
  "exit_tickets":[{"tier":"below","question":""},{"tier":"at","question":""},{"tier":"above","question":""}]
}
Make the tiers genuinely different in cognitive demand, concrete, and immediately usable. Exit tickets are one quick check-for-understanding each.`;

const TIER_STYLE = [
  "border-starblue/40 bg-starblue/[0.06]",
  "border-ember/40 bg-ember/[0.06]",
  "border-moss/40 bg-moss/[0.08]",
];

export default function Scaffold() {
  const [className, setClassName] = useState("Period 3 · 7th Grade Math");
  const [grade, setGrade] = useState("7");
  const [objective, setObjective] = useState(
    "Students can convert between fractions and decimals."
  );
  const [busy, setBusy] = useState(false);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [memory, setMemory] = useState<Recalled | null>(null);
  const [err, setErr] = useState("");

  const scope = everosScope("class", className);

  // Recall what Ember remembers about this class's skill distribution.
  useEffect(() => {
    let alive = true;
    recall(scope, "class skill distribution, struggles, and strengths in math").then((r) => {
      if (alive) setMemory(r);
    });
    return () => {
      alive = false;
    };
  }, [scope]);

  async function generate() {
    if (!objective.trim() || busy) return;
    setBusy(true);
    setErr("");
    setLesson(null);

    const memNote = memory?.profiles?.length
      ? `\n\nWhat you remember about this class (use it to calibrate the tiers):\n- ${memory.profiles
          .slice(0, 5)
          .join("\n- ")}`
      : "";

    const out = await completeJSON<Lesson>(
      SYSTEM,
      `Grade: ${grade}\nClass: ${className}\nLesson objective: ${objective}${memNote}`,
      1800
    );

    if (!out?.tiers?.length) {
      setErr("Couldn't generate the lesson (LLM unavailable). Try again in a moment.");
      setBusy(false);
      return;
    }
    setLesson(out);
    setBusy(false);

    // Remember that this class worked on this objective — builds the distribution over time.
    ingestExchange(
      scope,
      "scaffold",
      `Our class "${className}" (grade ${grade}) worked on the objective: ${objective}. We used a below/at/above tiered lesson.`,
      `Noted this lesson for ${className}. Tiers spanned ${out.tiers.map((t) => t.level).join(", ")}.`
    );
  }

  return (
    <ModeShell
      active="scaffold"
      title="Scaffold"
      subtitle="Paste one objective. Get a below / at / above-grade lesson for your whole class — calibrated by what Ember remembers about this class."
    >
      <div className="grid gap-3 mb-5 sm:grid-cols-[1fr_100px]">
        <input
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          placeholder="Class / period"
          className="rounded-card border border-ink/10 bg-white px-4 py-2.5 outline-none focus:border-ember/60"
        />
        <input
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          placeholder="Grade"
          className="rounded-card border border-ink/10 bg-white px-4 py-2.5 outline-none focus:border-ember/60"
        />
      </div>
      <textarea
        value={objective}
        onChange={(e) => setObjective(e.target.value)}
        rows={2}
        placeholder="Lesson objective (e.g. Students can solve two-step equations)"
        className="w-full rounded-card border border-ink/10 bg-white px-4 py-3 outline-none focus:border-ember/60 resize-none"
      />

      {memory?.profiles?.length ? (
        <div className="mt-3 rounded-card bg-cloud/70 border border-ink/[0.06] p-3 text-sm">
          <div className="font-semibold text-ink/80 mb-1">🧠 What Ember remembers about this class</div>
          <ul className="text-slate2 space-y-0.5 list-disc pl-5">
            {memory.profiles.slice(0, 4).map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        onClick={generate}
        disabled={busy}
        className="mt-4 rounded-full bg-ink text-morning font-bold px-6 py-3 hover:brightness-110 transition disabled:opacity-50"
      >
        {busy ? "Building your tiers…" : "Generate tiered lesson"}
      </button>
      {busy && <div className="mt-3"><Spinner label="Differentiating for three skill levels…" /></div>}
      {err && <p className="mt-3 text-cinder text-sm">{err}</p>}

      {lesson && (
        <div className="mt-7 space-y-4 animate-fade-up">
          <div className="grid gap-4 md:grid-cols-3">
            {lesson.tiers.map((t, i) => (
              <div key={i} className={`rounded-card border p-4 ${TIER_STYLE[i] || TIER_STYLE[1]}`}>
                <div className="font-display font-bold text-lg">{t.level}</div>
                <p className="text-sm text-ink/80 mt-1">{t.summary}</p>
                <p className="text-sm text-ink mt-3">{t.activity}</p>
                {t.supports?.length > 0 && (
                  <ul className="mt-3 space-y-1 text-[13px] text-slate2 list-disc pl-4">
                    {t.supports.map((s, j) => (
                      <li key={j}>{s}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <div className="rounded-card border border-ink/10 bg-white p-4">
            <div className="font-display font-bold text-lg mb-2">Exit tickets</div>
            <div className="space-y-2">
              {lesson.exit_tickets.map((e, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <span className="shrink-0 uppercase text-[10px] font-bold tracking-wider text-slate2 mt-1 w-12">
                    {e.tier}
                  </span>
                  <span className="text-ink">{e.question}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </ModeShell>
  );
}
