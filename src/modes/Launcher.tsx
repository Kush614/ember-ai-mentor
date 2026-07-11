import EmberDot from "../components/EmberDot";

const CARDS = [
  { hash: "#/", emoji: "🔥", name: "Mentor", tag: "Relationship-aware tutor", desc: "Socratic tutoring with visible memory and a Connector that hands you back to a human.", accent: "border-ember/40" },
  { hash: "#/scaffold", emoji: "📚", name: "Scaffold", tag: "For teachers", desc: "One objective in, a below / at / above-grade lesson out — calibrated by what it remembers about your class.", accent: "border-starblue/40" },
  { hash: "#/viva", emoji: "🎙️", name: "Viva", tag: "Assessment, reinvented", desc: "An oral exam that probes understanding and never re-tests what you've already mastered.", accent: "border-flicker/40" },
  { hash: "#/sidecar", emoji: "📖", name: "Sidecar", tag: "Learning differences", desc: "Reshapes any reading for dyslexia, English learners, or focus needs — and remembers your accommodations.", accent: "border-moss/40" },
  { hash: "#/compass", emoji: "🧭", name: "Compass", tag: "Lifelong learning", desc: "Name a target role; get a living, weekly curriculum that diffs the market against what you already know.", accent: "border-cinder/40" },
];

export default function Launcher() {
  return (
    <div className="min-h-full bg-morning text-ink">
      <div className="max-w-[1000px] mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-2">
          <EmberDot size={30} />
          <h1 className="font-display font-extrabold text-4xl tracking-tight">Ember</h1>
        </div>
        <p className="text-slate2 text-lg mb-8 max-w-2xl">
          One memory layer, five agents. Every one remembers the learner as a person — and knows when a human helps more.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((c) => (
            <a
              key={c.hash}
              href={c.hash}
              className={`group rounded-card border ${c.accent} bg-white p-5 shadow-day hover:-translate-y-0.5 transition`}
            >
              <div className="text-3xl mb-2">{c.emoji}</div>
              <div className="flex items-baseline gap-2">
                <span className="font-display font-bold text-xl">{c.name}</span>
                <span className="text-[11px] uppercase tracking-wide text-slate2 font-semibold">{c.tag}</span>
              </div>
              <p className="text-sm text-slate2 mt-1.5 leading-relaxed">{c.desc}</p>
              <span className="inline-block mt-3 text-sm font-semibold text-ember group-hover:translate-x-0.5 transition">
                Open →
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
