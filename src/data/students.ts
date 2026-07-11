import type { MemoryEntry } from "../types";
import { seedMemories, LEARNER } from "./seed";

// A roster of learners spanning K-12 → high school. Each has a compact
// structured memory graph (drives the Mentor Canvas) AND a seed conversation
// that is ingested into EverOS (drives real recall in every mode).

export type Accommodation = "dyslexia" | "ell" | "adhd";

export interface StudentSpec {
  id: string;
  name: string;
  emoji: string;
  grade: number;
  gradesBand: string; // "K–2" | "3–5" | "6–8" | "9–12"
  bandLabel: string;
  subject: string;
  blurb: string;
  bestModality: string; // pattern
  accommodations: Accommodation[];
  concepts: { key: string; label: string; mastery: number; note?: string; decaying?: boolean }[];
  people: { key: string; name: string; role: string; context: string }[];
  goal: { key: string; label: string; status: "new" | "progress" | "achieved" };
  careerGoal?: string; // for Compass (older students)
  knownSkills?: string; // for Compass
  seedTurns: [("user" | "assistant"), string][]; // → EverOS
}

export const STUDENTS: StudentSpec[] = [
  {
    id: "leo-g1",
    name: "Leo",
    emoji: "🦕",
    grade: 1,
    gradesBand: "K–2",
    bandLabel: "1st Grade",
    subject: "Early math",
    blurb: "Counting & addition. Loves dinosaurs. Big energy, short focus.",
    bestModality: "dinosaur and animal counting examples",
    accommodations: ["adhd"],
    concepts: [
      { key: "counting.100", label: "Counting to 100", mastery: 0.7 },
      { key: "add.within20", label: "Addition within 20", mastery: 0.5, note: "counts on fingers" },
      { key: "shapes.2d", label: "2D shapes", mastery: 0.85 },
    ],
    people: [{ key: "mr-park", name: "Mr. Park", role: "teacher", context: "Leo loves story time with him" }],
    goal: { key: "count-by-5s", label: "Count to 100 by 5s", status: "progress" },
    seedTurns: [
      ["user", "I'm Leo! I'm in first grade and I LOVE dinosaurs, especially T-rex!"],
      ["assistant", "Hi Leo! Dinosaurs are awesome. Let's count some dinosaurs today."],
      ["user", "If 3 T-rex and 2 more come, that's... 5 dinosaurs!"],
      ["assistant", "Yes! 3 + 2 = 5. Counting dinosaurs really helps you add."],
      ["user", "I get wiggly and can only do a little bit at a time."],
      ["assistant", "That's okay Leo — we'll do short bursts. Small steps count."],
      ["user", "My teacher Mr. Park does the best story time."],
      ["assistant", "Mr. Park sounds wonderful. I'll remember dinosaur counting is your way in."],
    ],
  },
  {
    id: "aisha-g4",
    name: "Aisha",
    emoji: "🎨",
    grade: 4,
    gradesBand: "3–5",
    bandLabel: "4th Grade",
    subject: "Multiplication & fractions",
    blurb: "English learner. Learns through drawing. Careful and thoughtful.",
    bestModality: "drawing and visual models",
    accommodations: ["ell"],
    concepts: [
      { key: "mult.facts", label: "Multiplication facts", mastery: 0.55, note: "shaky on 7s and 8s" },
      { key: "fractions.intro", label: "Understanding fractions", mastery: 0.4 },
      { key: "area.perimeter", label: "Area & perimeter", mastery: 0.6 },
    ],
    people: [{ key: "ms-chen", name: "Ms. Chen", role: "teacher", context: "helps Aisha with new English words" }],
    goal: { key: "times-tables", label: "Master all times tables", status: "progress" },
    seedTurns: [
      ["user", "Hi, I am Aisha. English is my second language so sometimes the words are hard."],
      ["assistant", "Welcome Aisha. We'll keep the words simple and use lots of pictures."],
      ["user", "I like to draw the math. When I draw fractions like a pizza I understand it."],
      ["assistant", "Drawing is a great strategy — pictures make fractions clear for you."],
      ["user", "7 times 8 is still hard for me."],
      ["assistant", "We'll practice the 7s and 8s with arrays you can draw."],
      ["user", "Ms. Chen helps me when a word is new."],
      ["assistant", "Ms. Chen is a great helper. I'll pre-teach tricky words for you too."],
    ],
  },
  {
    id: LEARNER.id, // Maya — the flagship, rich graph comes from seed.ts
    name: LEARNER.display_name,
    emoji: "⚽",
    grade: 7,
    gradesBand: "6–8",
    bandLabel: "7th Grade",
    subject: "Fractions & decimals",
    blurb: "Soccer fan. Breakthrough on equivalent fractions. Trusts Ms. Rivera.",
    bestModality: "soccer analogies",
    accommodations: [],
    concepts: [],
    people: [],
    goal: { key: "thursday-quiz", label: "Pass Thursday fractions quiz", status: "achieved" },
    seedTurns: [
      ["user", "I'm Maya, 7th grade, I love soccer. Math stresses me out, worse after 8pm."],
      ["assistant", "Hi Maya. Let's use soccer to make math click, and keep sessions earlier."],
      ["user", "The soccer ratio thing made equivalent fractions finally click! big breakthrough."],
      ["assistant", "Soccer analogies are how you learn best — I'll keep using them."],
      ["user", "Ms. Rivera is who I trust most and I passed my Thursday fractions quiz!"],
      ["assistant", "Congrats Maya! Ms. Rivera is a great mentor for you."],
      ["user", "Adding unlike fractions is hard, I forget the common denominator. Also Jordan is stuck on equivalent fractions."],
      ["assistant", "We'll drill common denominators — and you could teach Jordan the soccer trick."],
    ],
  },
  {
    id: "diego-g8",
    name: "Diego",
    emoji: "🏀",
    grade: 8,
    gradesBand: "6–8",
    bandLabel: "8th Grade",
    subject: "Ratios & equations",
    blurb: "Basketball. Has dyslexia — reads best chunked. Quick with numbers out loud.",
    bestModality: "basketball stats and spoken explanations",
    accommodations: ["dyslexia"],
    concepts: [
      { key: "ratios.prop", label: "Ratios & proportions", mastery: 0.5 },
      { key: "equations.onestep", label: "One-step equations", mastery: 0.45, note: "flips the operation" },
      { key: "fractions.decimals", label: "Fractions ↔ decimals", mastery: 0.6 },
    ],
    people: [
      { key: "coach-ramirez", name: "Coach Ramirez", role: "coach", context: "Diego trusts him, talks stats" },
      { key: "ms-rivera", name: "Ms. Rivera", role: "math teacher", context: "patient with reading" },
    ],
    goal: { key: "algebra-ready", label: "Be ready for Algebra 1", status: "progress" },
    seedTurns: [
      ["user", "I'm Diego, 8th grade, I play basketball. Reading big blocks of text is hard for me — I have dyslexia."],
      ["assistant", "Got it Diego — I'll chunk everything and we can talk it out loud."],
      ["user", "If I say it out loud with basketball stats I get it. Like shooting percentages are ratios."],
      ["assistant", "Exactly — shooting percentage is a ratio. Basketball is your way in."],
      ["user", "One-step equations trip me up, I flip the operation."],
      ["assistant", "We'll slow down the inverse-operation step until it sticks."],
      ["user", "Coach Ramirez always helps me see the numbers."],
      ["assistant", "Coach Ramirez is a great ally. I'll keep explanations spoken and chunked."],
    ],
  },
  {
    id: "sofia-g10",
    name: "Sofia",
    emoji: "🔬",
    grade: 10,
    gradesBand: "9–12",
    bandLabel: "10th Grade",
    subject: "Functions & quadratics",
    blurb: "Wants to be an engineer. Strong but test-anxious. Loves real-world uses.",
    bestModality: "real-world engineering examples",
    accommodations: [],
    concepts: [
      { key: "linear.functions", label: "Linear functions", mastery: 0.75 },
      { key: "quadratics", label: "Quadratic equations", mastery: 0.4, note: "factoring is shaky" },
      { key: "probability.intro", label: "Intro to probability", mastery: 0.55 },
    ],
    people: [{ key: "mr-okafor", name: "Mr. Okafor", role: "math teacher", context: "Sofia asks him before tests" }],
    goal: { key: "ap-track", label: "Make the AP Calculus track", status: "progress" },
    seedTurns: [
      ["user", "I'm Sofia, 10th grade. I want to be an engineer. I get really anxious before math tests."],
      ["assistant", "Hi Sofia. Engineering is a great goal — and we'll work on test nerves together."],
      ["user", "I love when math connects to real things, like bridges and forces."],
      ["assistant", "Real-world engineering framing is clearly how you connect — I'll lean on it."],
      ["user", "Linear functions I'm solid on, but factoring quadratics still trips me."],
      ["assistant", "We'll build factoring up slowly so it feels automatic before your test."],
      ["user", "I always check with Mr. Okafor before a big test."],
      ["assistant", "Mr. Okafor is a great pre-test anchor. I'll help you walk in calm and ready."],
    ],
  },
  {
    id: "marcus-g12",
    name: "Marcus",
    emoji: "📈",
    grade: 12,
    gradesBand: "9–12",
    bandLabel: "12th Grade",
    subject: "Stats & career prep",
    blurb: "Senior eyeing a data-analyst path. Strong with functions, loves real datasets.",
    bestModality: "real datasets and career-relevant examples",
    accommodations: [],
    careerGoal: "Data analyst in 6 months",
    knownSkills: "Excel, basic statistics, some SQL, a little Python",
    concepts: [
      { key: "probability.intro", label: "Intro to probability", mastery: 0.6 },
      { key: "linear.functions", label: "Linear functions", mastery: 0.8 },
      { key: "quadratics", label: "Quadratic equations", mastery: 0.65, decaying: true },
    ],
    people: [{ key: "ms-lee", name: "Ms. Lee", role: "counselor", context: "helping Marcus plan after graduation" }],
    goal: { key: "data-analyst", label: "Break into a data-analyst role", status: "progress" },
    seedTurns: [
      ["user", "I'm Marcus, a senior. I want to become a data analyst within 6 months of graduating."],
      ["assistant", "Great target Marcus. Let's map the skills a data analyst actually needs."],
      ["user", "I know Excel, basic stats, some SQL and a little Python. Probability I'm okay at."],
      ["assistant", "Solid base. We'll close the gaps — SQL depth, Python for analysis, and statistics."],
      ["user", "I learn best from real datasets, not toy problems."],
      ["assistant", "Real datasets it is — that's how this'll stick and build your portfolio."],
      ["user", "Ms. Lee, my counselor, is helping me plan the after-graduation steps."],
      ["assistant", "Ms. Lee is a great partner in this. I'll keep the plan job-market-relevant."],
    ],
  },
];

export function getStudent(id: string): StudentSpec | undefined {
  return STUDENTS.find((s) => s.id === id);
}

const NOW_ISO = "2026-07-11T11:20:00Z";

// Build the structured memory graph (Mentor Canvas) for a student.
export function buildStudentEntries(spec: StudentSpec): MemoryEntry[] {
  // Maya keeps her rich, hand-authored graph.
  if (spec.id === LEARNER.id) return seedMemories();

  const entries: MemoryEntry[] = [];
  const mk = (type: MemoryEntry["type"], key: string, data: any, confidence: number, updated = NOW_ISO): MemoryEntry => ({
    id: `${type}:${key}`,
    learner_id: spec.id,
    type,
    key,
    data,
    confidence,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: updated,
    source_session: "history",
  });

  for (const c of spec.concepts)
    entries.push(
      mk(
        "concept",
        c.key,
        { label: c.label, mastery: c.mastery, attempts: 3, last_error_type: c.note || null, best_modality: null, decaying: !!c.decaying },
        0.8,
        c.decaying ? "2026-07-02T00:00:00Z" : NOW_ISO
      )
    );
  for (const p of spec.people) entries.push(mk("person", p.key, { name: p.name, role: p.role, context: p.context }, 0.85));
  entries.push(mk("goal", spec.goal.key, { label: spec.goal.label, status: spec.goal.status }, 0.7));
  entries.push(mk("pattern", "modality", { label: `Learns best with ${spec.bestModality}`, strength: 0.85 }, 0.85));
  return entries;
}
