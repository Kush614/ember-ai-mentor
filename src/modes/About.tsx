import EmberDot from "../components/EmberDot";

// ── About Ember — a stunning, self-contained product story ──────────

function Shot({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return (
    <figure className="gum-lg rounded-2xl overflow-hidden bg-white">
      <img src={src} alt={alt} loading="lazy" className="w-full block border-b-2 border-black" />
      <figcaption className="px-4 py-2.5 text-sm font-bold text-black">{caption}</figcaption>
    </figure>
  );
}

function Arrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-1 shrink-0">
      {label && <span className="text-[10px] font-bold uppercase tracking-wide text-black/50 mb-0.5">{label}</span>}
      <span className="text-2xl text-ember leading-none">→</span>
    </div>
  );
}

const AGENTS = [
  { emoji: "🔥", name: "Mentor", tag: "1:1 Socratic tutor", bg: "bg-gum-peach", desc: "Warm, memory-aware tutoring. Replies with diagrams, photos, videos & celebrations." },
  { emoji: "🧠", name: "Memory", tag: "The reveal", bg: "bg-gum-lav", desc: "Opens EverOS — every fact, episode, and the live recall the Mentor runs." },
  { emoji: "📚", name: "Scaffold", tag: "For teachers", bg: "bg-gum-blue", desc: "One objective → below/at/above-grade lesson + exit tickets, calibrated by class memory." },
  { emoji: "🎙️", name: "Viva", tag: "Assessment", bg: "bg-gum-yellow", desc: "Oral exam that maps mastery — and never re-tests what you've already shown." },
  { emoji: "📖", name: "Sidecar", tag: "Learning differences", bg: "bg-gum-mint", desc: "Reshapes any reading for dyslexia, ELL, or focus — remembers each accommodation." },
  { emoji: "🧭", name: "Compass", tag: "Lifelong learning", bg: "bg-gum-pink", desc: "Names a target career, builds a living weekly curriculum from live job data." },
];

export default function About() {
  return (
    <div className="min-h-full bg-gum-cream text-black">
      {/* top bar */}
      <header className="h-16 flex items-center px-5 gap-3 border-b-2 border-black bg-gum-cream sticky top-0 z-20">
        <a href="#/" className="flex items-center gap-2 no-underline text-black">
          <EmberDot size={24} />
          <span className="font-display font-extrabold text-lg">Ember</span>
        </a>
        <div className="ml-auto flex items-center gap-2">
          <a href="#/" className="gum-btn rounded-lg bg-white text-black px-3 py-1.5 text-sm no-underline">← App</a>
          <a href="https://github.com/Kush614/ember-ai-mentor" target="_blank" rel="noreferrer" className="gum-btn rounded-lg bg-black text-white px-3 py-1.5 text-sm no-underline">GitHub</a>
        </div>
      </header>

      {/* HERO */}
      <section className="night bg-twilight text-[#E9EDF7] border-b-2 border-black">
        <div className="max-w-[1000px] mx-auto px-6 py-16 text-center relative overflow-hidden">
          <div className="mx-auto mb-5 h-14 w-14 rounded-full animate-breathe" style={{ background: "radial-gradient(circle at 42% 38%, #FFC46B 0%, #FF9E4A 55%, #B4552D 100%)", boxShadow: "0 0 40px 8px rgba(255,158,74,0.45)" }} />
          <div className="inline-block rounded-full border border-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#E9EDF7]/70 mb-4">
            Relationship-aware AI learning agent
          </div>
          <h1 className="font-display font-extrabold text-4xl md:text-6xl tracking-tight leading-[1.05]">
            The tutor that <span className="ember-gradient-text">remembers you</span>.
          </h1>
          <p className="mt-4 text-lg text-[#E9EDF7]/75 max-w-2xl mx-auto">
            Every AI tutor answers questions. Ember learns each student as a person, shows you exactly
            what it remembers, and knows when to hand you back to a human.
          </p>
          <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
            <a href="https://ember.butterbase.dev" className="gum-btn rounded-full bg-ember text-black px-6 py-3 font-extrabold no-underline">Try it live →</a>
            <a href="#/mentor" className="gum-btn rounded-full bg-white text-black px-6 py-3 font-extrabold no-underline">Open the Mentor</a>
          </div>
        </div>
      </section>

      <div className="max-w-[1000px] mx-auto px-6 py-14 space-y-16">
        {/* PROBLEM */}
        <section>
          <div className="text-xs font-bold uppercase tracking-wide text-black/50 mb-2">The problem</div>
          <h2 className="font-display font-extrabold text-3xl leading-tight">
            AI tutors forgot the most important part — the relationship.
          </h2>
          <p className="mt-3 text-lg text-black/70 max-w-2xl">
            Stanford's research is blunt: the crisis point of tech-heavy education is <strong>relationships</strong>,
            and AI should <em>strengthen</em> human connection, not replace it. Today's tutors answer, then forget you.
            Ember is built the other way around — memory first.
          </p>
        </section>

        {/* HOW IT WORKS — the loop */}
        <section>
          <div className="text-xs font-bold uppercase tracking-wide text-black/50 mb-2">How it works</div>
          <h2 className="font-display font-extrabold text-3xl mb-6">It learns you, remembers you, and acts on it.</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { n: "1", t: "LEARN", d: "After every message, an Observer agent extracts what changed — mastery, emotion, people, goals — and writes it to memory.", bg: "bg-gum-yellow" },
              { n: "2", t: "REMEMBER", d: "EverOS keeps episodic memories + a student profile across sessions. Ember recalls them before every reply.", bg: "bg-gum-lav" },
              { n: "3", t: "ACT", d: "A Connector decides when a human beats an AI — and drafts the hand-off to a teacher, parent, or classmate.", bg: "bg-gum-mint" },
            ].map((s) => (
              <div key={s.n} className={`gum rounded-2xl ${s.bg} p-5`}>
                <div className="font-data font-bold text-black/50">{s.n}</div>
                <div className="font-display font-extrabold text-xl mt-1">{s.t}</div>
                <p className="text-sm text-black/75 mt-1.5">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* MEMORY DIAGRAM */}
        <section>
          <div className="text-xs font-bold uppercase tracking-wide text-black/50 mb-2">Memory architecture</div>
          <h2 className="font-display font-extrabold text-3xl mb-6">
            Powered by <span className="ember-gradient-text">EverOS</span> — one memory, every agent.
          </h2>
          <div className="gum-lg rounded-2xl bg-white p-6 overflow-x-auto">
            <div className="flex items-stretch gap-1 min-w-[720px]">
              <Node emoji="🎓" title="Student" sub="asks a question" bg="bg-gum-cream" />
              <Arrow />
              <Node emoji="🔥" title="Agent" sub="1 of 5, Socratic reply" bg="bg-gum-peach" />
              <Arrow label="after each" />
              <Node emoji="👀" title="Observer" sub="extracts changes" bg="bg-white" />
              <Arrow label="ingest" />
              <Node emoji="🧠" title="EverOS" sub="memory layer" bg="bg-gum-lav" strong />
              <Arrow label="extract" />
              <Node emoji="📝" title="Facts + episodes" sub="durable memory" bg="bg-gum-mint" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm font-bold text-black/70 min-w-[720px]">
              <span className="text-ember text-xl">↑</span>
              <span>Before every reply the agent <b>recalls</b> from EverOS → folded into the memory digest.</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t-2 border-black/10">
              <span className="gum rounded-lg bg-gum-yellow px-3 py-1.5 text-sm font-bold">🧠 Memory Reveal — opens the stored memory</span>
              <span className="gum rounded-lg bg-white px-3 py-1.5 text-sm font-bold">🐦 Raven — same key, shared brain</span>
            </div>
          </div>
        </section>

        {/* SCREENSHOTS */}
        <section>
          <div className="text-xs font-bold uppercase tracking-wide text-black/50 mb-2">See it</div>
          <h2 className="font-display font-extrabold text-3xl mb-6">A real, deployed product.</h2>
          <div className="grid md:grid-cols-2 gap-5">
            <Shot src="/shots/04-memory.png" alt="Memory Reveal" caption="🧠 Memory Reveal — every fact, with the evidence, plus live recall" />
            <Shot src="/shots/06-mentor-diagram.png" alt="Mentor with diagram" caption="🔥 Mentor — teaches with a live diagram, voice & vision" />
            <Shot src="/shots/02-courses.png" alt="Courses dashboard" caption="🎓 Courses — pick a student K-12 → HS; every agent adapts" />
            <Shot src="/shots/03-lesson.png" alt="Tiered lesson" caption="📚 One concept, taught at below / at / above grade level" />
          </div>
        </section>

        {/* AGENTS */}
        <section>
          <div className="text-xs font-bold uppercase tracking-wide text-black/50 mb-2">The suite</div>
          <h2 className="font-display font-extrabold text-3xl mb-6">One memory layer, six ways.</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {AGENTS.map((a) => (
              <div key={a.name} className={`gum rounded-2xl ${a.bg} p-4`}>
                <div className="text-3xl mb-1">{a.emoji}</div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display font-extrabold text-lg">{a.name}</span>
                  <span className="text-[11px] font-bold uppercase text-black/50">{a.tag}</span>
                </div>
                <p className="text-sm text-black/75 mt-1">{a.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* STACK DIAGRAM */}
        <section>
          <div className="text-xs font-bold uppercase tracking-wide text-black/50 mb-2">Built on</div>
          <h2 className="font-display font-extrabold text-3xl mb-6">Live, deployed, keys kept safe.</h2>
          <div className="gum-lg rounded-2xl bg-white p-6">
            <div className="flex flex-col items-center gap-3">
              <div className="gum rounded-xl bg-gum-cream px-5 py-3 font-bold text-center w-full max-w-md">
                🌐 Browser — React SPA <span className="text-black/50 font-normal">(no secrets in the bundle)</span>
              </div>
              <span className="text-ember text-2xl">↓</span>
              <div className="gum rounded-xl bg-gum-lav px-5 py-3 w-full max-w-2xl text-center">
                <div className="font-extrabold mb-2">🧈 Butterbase serverless functions <span className="text-black/60 font-normal text-sm">— every API key lives here</span></div>
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="gum rounded-lg bg-white px-3 py-1 text-sm font-bold">/fn/claude</span>
                  <span className="gum rounded-lg bg-white px-3 py-1 text-sm font-bold">/fn/everos</span>
                  <span className="gum rounded-lg bg-white px-3 py-1 text-sm font-bold">/fn/tavily</span>
                </div>
              </div>
              <span className="text-ember text-2xl">↓</span>
              <div className="flex flex-wrap justify-center gap-2 w-full max-w-2xl">
                <span className="gum rounded-lg bg-gum-peach px-4 py-2 font-bold">Anthropic Claude</span>
                <span className="gum rounded-lg bg-gum-mint px-4 py-2 font-bold">EverOS memory</span>
                <span className="gum rounded-lg bg-gum-yellow px-4 py-2 font-bold">Tavily search</span>
              </div>
            </div>
            <p className="text-center text-sm text-black/60 mt-4">
              Plus Butterbase <b>auth</b>, <b>Postgres</b>, and <b>one-command hosting</b>. Runs fully on local mocks with zero keys.
            </p>
          </div>
        </section>

        {/* BOUNTY / JUDGING */}
        <section>
          <div className="text-xs font-bold uppercase tracking-wide text-black/50 mb-2">Why it wins</div>
          <h2 className="font-display font-extrabold text-3xl mb-6">Built for pedagogy, trust, and memory.</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { t: "Pedagogy", d: "Socratic, modality-matched, mastery not scores, spaced review, differentiated K-12 → HS.", bg: "bg-gum-blue" },
              { t: "Trust", d: "Memory is visible — the reveal is the transparency. The Connector defers to humans. No black box.", bg: "bg-gum-peach" },
              { t: "Self-evolving memory", d: "Change how a student is doing mid-session and the memory adapts, live — the EverMind bounty, built in.", bg: "bg-gum-mint" },
            ].map((p) => (
              <div key={p.t} className={`gum rounded-2xl ${p.bg} p-5`}>
                <div className="font-display font-extrabold text-lg">{p.t}</div>
                <p className="text-sm text-black/75 mt-1.5">{p.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CLOSE */}
        <section className="text-center py-8">
          <h2 className="font-display font-extrabold text-3xl md:text-4xl leading-tight max-w-3xl mx-auto">
            Every AI tutor answers questions.<br />
            <span className="ember-gradient-text">Ember knows when to hand you back to a human.</span>
          </h2>
          <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
            <a href="#/" className="gum-btn rounded-full bg-ember text-black px-6 py-3 font-extrabold no-underline">Explore the app →</a>
            <a href="https://github.com/Kush614/ember-ai-mentor" target="_blank" rel="noreferrer" className="gum-btn rounded-full bg-white text-black px-6 py-3 font-extrabold no-underline">View the code</a>
          </div>
          <p className="mt-6 text-sm text-black/50">
            Built by Kush for the AI for Education Hackathon @ Stanford · Butterbase · EverOS · Claude · Tavily
          </p>
        </section>
      </div>
    </div>
  );
}

function Node({ emoji, title, sub, bg, strong }: { emoji: string; title: string; sub: string; bg: string; strong?: boolean }) {
  return (
    <div className={`gum ${strong ? "gum-lg" : ""} rounded-xl ${bg} px-3 py-3 text-center shrink-0 w-[130px]`}>
      <div className="text-2xl">{emoji}</div>
      <div className="font-extrabold text-sm mt-1 leading-tight">{title}</div>
      <div className="text-[11px] text-black/55 font-medium">{sub}</div>
    </div>
  );
}
