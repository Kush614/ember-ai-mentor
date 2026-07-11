import { useState } from "react";
import { ModeShell, Spinner, everosScope } from "./shared";
import { completeJSON } from "../lib/llm";
import { searchJobs } from "../lib/tavily";
import { recall, ingestExchange } from "../lib/everos";
import { useStore } from "../lib/store";
import { getStudent } from "../data/students";

interface Plan {
  required_skills: { skill: string; have: boolean; note: string }[];
  curriculum: { week: number; focus: string; why: string; resource: string }[];
}

export default function Compass() {
  const learner = useStore((s) => s.learner);
  const learnerId = learner?.id || "guest";
  const scope = learnerId; // one shared memory per student across all agents
  const student = getStudent(learnerId);

  const goalRole = student?.careerGoal?.replace(/\s+in\s+.*/i, "").trim();
  const goalTime = student?.careerGoal?.match(/in\s+(.+)/i)?.[1];
  const [role, setRole] = useState(goalRole || "Data analyst");
  const [timeframe, setTimeframe] = useState(goalTime || "6 months");
  const [haveSkills, setHaveSkills] = useState(student?.knownSkills || "Excel, basic statistics, some Python");
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [live, setLive] = useState<boolean | null>(null);
  const [err, setErr] = useState("");

  async function build() {
    if (!role.trim() || busy) return;
    setBusy(true);
    setErr("");
    setPlan(null);

    // 1) known skills = manual input + what EverOS remembers
    const remembered = await recall(scope, `skills and experience this learner already has for ${role}`);
    const known = [haveSkills, ...remembered.profiles].filter(Boolean).join("; ");

    // 2) live job postings via Tavily (graceful fallback)
    const jobs = await searchJobs(`${role} job requirements and required skills 2026`, 6);
    setLive(!!jobs);
    const jobContext = jobs
      ? `\n\nCurrent job postings (extract the real required skills from these):\n${jobs
          .map((j) => `• ${j.title}: ${j.content}`)
          .join("\n")}`
      : `\n\n(No live postings available — use your own up-to-date knowledge of what this role requires.)`;

    const sys = `You are Compass, a career-transition learning planner. Target role: ${role}. Timeframe: ${timeframe}.
The learner already has: ${known || "(not specified)"}.
Diff the role's required skills against what they have, then design a week-by-week curriculum that closes the gap within the timeframe. Front-load the highest-leverage gaps.
Respond ONLY with JSON:
{"required_skills":[{"skill":"","have":true,"note":"why it matters / their current level"}],"curriculum":[{"week":1,"focus":"","why":"","resource":"a concrete kind of resource or project"}]}`;

    const out = await completeJSON<Plan>(sys, jobContext, 2000);
    if (!out?.curriculum?.length) {
      setErr("Couldn't build the plan (LLM unavailable). Try again in a moment.");
      setBusy(false);
      return;
    }
    setPlan(out);
    setBusy(false);

    // remember what they have, for smarter re-plans
    ingestExchange(
      scope,
      "compass",
      `I'm targeting ${role} in ${timeframe}. I already have: ${known}.`,
      `Building toward ${role}. Confirmed skills: ${out.required_skills.filter((s) => s.have).map((s) => s.skill).join(", ") || known}.`
    );
  }

  function markLearned(skill: string) {
    if (!plan) return;
    setPlan({
      ...plan,
      required_skills: plan.required_skills.map((s) => (s.skill === skill ? { ...s, have: true } : s)),
    });
    ingestExchange(scope, "compass", `I just learned ${skill}.`, `Learner now has ${skill} for the ${role} path.`);
  }

  const gaps = plan?.required_skills.filter((s) => !s.have).length ?? 0;

  return (
    <ModeShell
      active="compass"
      title="Compass"
      subtitle="Name the role you're aiming for. Compass diffs it against what you already know and builds a living, week-by-week curriculum."
    >
      <div className="grid gap-3 sm:grid-cols-2 mb-3">
        <label className="text-sm">
          <span className="font-semibold text-ink/80">Target role</span>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 w-full rounded-card border border-ink/10 bg-white px-4 py-2.5 outline-none focus:border-ember/60"
          />
        </label>
        <label className="text-sm">
          <span className="font-semibold text-ink/80">Timeframe</span>
          <input
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="mt-1 w-full rounded-card border border-ink/10 bg-white px-4 py-2.5 outline-none focus:border-ember/60"
          />
        </label>
      </div>
      <label className="text-sm block">
        <span className="font-semibold text-ink/80">Skills you already have</span>
        <input
          value={haveSkills}
          onChange={(e) => setHaveSkills(e.target.value)}
          className="mt-1 w-full rounded-card border border-ink/10 bg-white px-4 py-2.5 outline-none focus:border-ember/60"
        />
      </label>

      <button
        onClick={build}
        disabled={busy}
        className="mt-4 rounded-full bg-ink text-morning font-bold px-6 py-3 hover:brightness-110 transition disabled:opacity-50"
      >
        {busy ? "Charting your path…" : plan ? "Re-plan" : "Build my curriculum"}
      </button>
      {busy && <div className="mt-3"><Spinner label="Reading the market and diffing your skills…" /></div>}
      {err && <p className="mt-3 text-cinder text-sm">{err}</p>}

      {plan && (
        <div className="mt-6 animate-fade-up">
          <div className="flex items-center gap-3 mb-4 text-sm">
            <span className="font-data text-slate2">{gaps} skill gaps to close</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs border ${
                live ? "border-moss/40 bg-moss/10 text-moss" : "border-ink/15 bg-cloud text-slate2"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-moss" : "bg-slate2/50"}`} />
              {live ? "live job data (Tavily)" : "model knowledge (add Tavily key for live postings)"}
            </span>
          </div>

          <div className="grid lg:grid-cols-[300px_1fr] gap-6">
            {/* skill diff */}
            <div>
              <div className="font-display font-bold mb-2">Skill gap</div>
              <div className="space-y-1.5">
                {plan.required_skills.map((s, i) => (
                  <div
                    key={i}
                    className={`rounded-card border p-2.5 text-sm ${
                      s.have ? "border-moss/40 bg-moss/[0.07]" : "border-ember/40 bg-ember/[0.06]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink">{s.skill}</span>
                      {s.have ? (
                        <span className="text-moss text-xs font-bold">have ✓</span>
                      ) : (
                        <button onClick={() => markLearned(s.skill)} className="text-cinder text-xs font-bold hover:underline">
                          mark learned
                        </button>
                      )}
                    </div>
                    {s.note && <p className="text-slate2 text-[13px] mt-0.5">{s.note}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* curriculum */}
            <div>
              <div className="font-display font-bold mb-2">Your living curriculum</div>
              <ol className="relative border-l-2 border-ink/10 pl-5 space-y-4">
                {plan.curriculum.map((w, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[27px] top-0.5 h-5 w-5 rounded-full bg-ember text-white text-[11px] font-bold grid place-items-center font-data">
                      {w.week}
                    </span>
                    <div className="rounded-card border border-ink/10 bg-white p-3">
                      <div className="font-semibold text-ink">{w.focus}</div>
                      <p className="text-sm text-slate2 mt-0.5">{w.why}</p>
                      <p className="text-[13px] text-ink/70 mt-1.5">
                        <span className="font-semibold">Do: </span>
                        {w.resource}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </ModeShell>
  );
}
