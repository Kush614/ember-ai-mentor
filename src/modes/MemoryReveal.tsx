import { useEffect, useState } from "react";
import { ModeShell, Spinner } from "./shared";
import { useStore } from "../lib/store";
import { dumpMemory, recall, type MemoryFact, type Episode, type Recalled } from "../lib/everos";
import { getStudent } from "../data/students";

const CAT: Record<string, { emoji: string; color: string }> = {
  basic_info: { emoji: "🧑", color: "bg-slate2/10" },
  interests: { emoji: "⚡", color: "bg-gum-yellow/40" },
  academic_challenges: { emoji: "📉", color: "bg-gum-pink/30" },
  academic_goals: { emoji: "🎯", color: "bg-gum-lav/40" },
  trusted_person: { emoji: "🤝", color: "bg-starblue/20" },
  academic_progress: { emoji: "✅", color: "bg-gum-mint/30" },
  learning_style: { emoji: "🎨", color: "bg-gum-blue/30" },
  learning_needs: { emoji: "♿", color: "bg-gum-peach/40" },
  learning_preference: { emoji: "🎨", color: "bg-gum-blue/30" },
};
const catStyle = (c: string) => CAT[c] || { emoji: "🧠", color: "bg-cloud" };

function relTime(ts?: string | number): string {
  if (!ts) return "";
  try {
    const d = new Date(ts).getTime();
    const days = Math.floor((Date.now() - d) / 86400000);
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 7) return `${days} days ago`;
    return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function MemoryReveal() {
  const learner = useStore((s) => s.learner);
  const entries = useStore((s) => s.entries);
  const learnerId = learner?.id || "guest";
  const student = getStudent(learnerId);

  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFact, setOpenFact] = useState<number | null>(null);

  const [query, setQuery] = useState("");
  const [recalled, setRecalled] = useState<Recalled | null>(null);
  const [searching, setSearching] = useState(false);

  const load = () => {
    setLoading(true);
    dumpMemory(learnerId).then((d) => {
      setFacts(d.facts);
      setEpisodes(d.episodes);
      setLoading(false);
    });
  };
  useEffect(load, [learnerId]);

  async function doRecall() {
    if (!query.trim()) return;
    setSearching(true);
    setRecalled(await recall(learnerId, query, 4));
    setSearching(false);
  }

  const concepts = entries.filter((e) => e.type === "concept");
  const people = entries.filter((e) => e.type === "person");
  const goals = entries.filter((e) => e.type === "goal");

  return (
    <ModeShell
      active="memory"
      title={`What Ember remembers about ${learner?.name || "you"}`}
      subtitle="This is exactly what your build stored and recalls — extracted into EverOS and shared across every session and every agent."
    >
      <div className="flex items-center gap-3 mb-5 text-sm">
        <span className="font-data text-slate2">
          🧠 {facts.length} facts · 📖 {episodes.length} episodes · 📊 {concepts.length} concepts
        </span>
        <button onClick={load} className="rounded-full border border-ink/15 px-3 py-1 hover:bg-cloud transition">
          ↻ Refresh
        </button>
        {student && (
          <span className="text-slate2">
            {student.emoji} {student.bandLabel}
          </span>
        )}
      </div>

      {/* Live recall — the cross-session proof */}
      <div className="rounded-card border-2 border-ink/10 bg-white p-4 mb-6">
        <div className="font-display font-bold mb-1">🔎 Ask what Ember remembers</div>
        <p className="text-sm text-slate2 mb-3">
          This is the exact recall the Mentor runs before every reply — pulled from past sessions.
        </p>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doRecall()}
            placeholder={`e.g. how does ${learner?.name || "this student"} learn best?`}
            className="flex-1 rounded-full border border-ink/10 bg-morning px-4 py-2.5 outline-none focus:border-ember/60"
          />
          <button
            onClick={doRecall}
            disabled={searching}
            className="rounded-full bg-ink text-morning font-bold px-5 hover:brightness-110 transition disabled:opacity-50"
          >
            Recall
          </button>
        </div>
        {searching && <div className="mt-3"><Spinner label="Searching EverOS…" /></div>}
        {recalled && !searching && (
          <div className="mt-3 space-y-1.5 animate-fade-up">
            {recalled.profiles.slice(0, 5).map((p, i) => (
              <div key={i} className="text-sm rounded-lg bg-gum-mint/20 px-3 py-1.5">🧠 {p}</div>
            ))}
            {recalled.episodes.slice(0, 2).map((e, i) => (
              <div key={i} className="text-sm rounded-lg bg-cloud px-3 py-1.5 text-slate2">📖 {e.summary}</div>
            ))}
            {!recalled.profiles.length && !recalled.episodes.length && (
              <div className="text-sm text-slate2">Nothing recalled yet — chat as this student first.</div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <Spinner label="Opening EverOS memory…" />
      ) : (
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          {/* Facts */}
          <div>
            <h2 className="font-display font-extrabold text-xl mb-3">Extracted facts</h2>
            {facts.length === 0 ? (
              <p className="text-slate2 text-sm">No facts yet — have a conversation as this student and they'll appear here.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2.5">
                {facts.map((f, i) => {
                  const st = catStyle(f.category);
                  const open = openFact === i;
                  return (
                    <button
                      key={i}
                      onClick={() => setOpenFact(open ? null : i)}
                      className={`text-left rounded-card border border-ink/10 p-3 ${st.color} hover:border-ink/25 transition`}
                    >
                      <div className="flex items-start gap-2">
                        <span>{st.emoji}</span>
                        <div className="flex-1">
                          <div className="text-[10px] uppercase tracking-wide font-bold text-ink/50">
                            {f.category.replace(/_/g, " ")}
                          </div>
                          <div className="text-sm text-ink font-medium">{f.description}</div>
                          {open && f.evidence && (
                            <div className="mt-2 text-xs text-slate2 border-l-2 border-ink/15 pl-2 italic">
                              {f.evidence}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Structured mastery graph */}
            {concepts.length > 0 && (
              <>
                <h2 className="font-display font-extrabold text-xl mt-7 mb-3">Concept mastery</h2>
                <div className="space-y-2">
                  {concepts.map((c) => {
                    const m = Math.round((c.data.mastery || 0) * 100);
                    const color = m >= 75 ? "bg-gum-mint" : m >= 35 ? "bg-gum-yellow" : "bg-gum-pink";
                    return (
                      <div key={c.key} className="flex items-center gap-3">
                        <span className="text-sm w-44 shrink-0 truncate">{c.data.label}</span>
                        <div className="flex-1 h-2.5 rounded-full bg-cloud overflow-hidden">
                          <div className={`h-full ${color}`} style={{ width: `${m}%` }} />
                        </div>
                        <span className="font-data text-xs text-slate2 w-9 text-right">{m}%</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {people.map((p) => (
                    <span key={p.key} className="text-xs rounded-full bg-starblue/20 border border-starblue/30 px-2.5 py-1">
                      🤝 {p.data.name}
                    </span>
                  ))}
                  {goals.map((g) => (
                    <span key={g.key} className="text-xs rounded-full bg-goalgold/30 border border-goalgold/40 px-2.5 py-1">
                      {g.data.status === "achieved" ? "⭐" : "🎯"} {g.data.label}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Episodes timeline */}
          <div>
            <h2 className="font-display font-extrabold text-xl mb-3">Session episodes</h2>
            {episodes.length === 0 ? (
              <p className="text-slate2 text-sm">No episodes yet.</p>
            ) : (
              <ol className="relative border-l-2 border-ink/10 pl-4 space-y-3">
                {episodes.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-ember border-2 border-morning" />
                    <div className="rounded-card border border-ink/10 bg-white p-3">
                      <div className="text-[11px] font-bold text-slate2">{relTime(e.timestamp)}</div>
                      {e.subject && <div className="font-semibold text-sm text-ink mt-0.5">{e.subject}</div>}
                      <p className="text-sm text-slate2 mt-1 line-clamp-4">{e.summary}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-4 text-xs text-slate2 rounded-card bg-cloud/70 p-3">
              Powered by <span className="font-bold text-ink">EverOS</span>. Memory persists across every session and is
              shared by all five agents — the same substrate Raven is built on.
            </div>
          </div>
        </div>
      )}
    </ModeShell>
  );
}
