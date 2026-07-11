// Pre-generated, cached tiered math lessons (built at deploy time via the
// Claude proxy → src/data/precache.json). Loads instantly, works offline,
// and gives every student level a saved result for the demo.
import data from "../data/precache.json";

export interface Tier {
  level: string;
  summary: string;
  activity: string;
}
export interface CachedLesson {
  id: string;
  band: string;
  grades: string;
  concept: string;
  intro: string;
  tiers: Tier[];
  exit_tickets: { tier: string; question: string }[];
  misconception?: string;
}

export const LESSONS = data as CachedLesson[];

export const BAND_ORDER = ["K–2", "3–5", "6–8", "9–12"];

export const BAND_STYLE: Record<string, { bg: string; label: string }> = {
  "K–2": { bg: "bg-gum-yellow", label: "Early Elementary" },
  "3–5": { bg: "bg-gum-mint", label: "Upper Elementary" },
  "6–8": { bg: "bg-gum-lav", label: "Middle School" },
  "9–12": { bg: "bg-gum-pink", label: "High School" },
};

export function lessonsByBand(): { grades: string; lessons: CachedLesson[] }[] {
  return BAND_ORDER.map((grades) => ({
    grades,
    lessons: LESSONS.filter((l) => l.grades === grades),
  })).filter((g) => g.lessons.length);
}
