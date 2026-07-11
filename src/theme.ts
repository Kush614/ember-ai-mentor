// Single source of truth for Ember Field node colors — Canvas and
// tooltips import from here so they can never drift apart.

export const palette = {
  morning: "#F6F7F4",
  cloud: "#EBEEE8",
  ink: "#20262E",
  slate2: "#5C6672",
  twilight: "#131A33",
  deepnight: "#0C1026",
  ember: "#FF9E4A",
  emberhot: "#FFC46B",
  cinder: "#B4552D",
  flicker: "#E8B84B",
  starblue: "#8FB4FF",
  goalgold: "#FFD98E",
  moss: "#7FC8A9",
  nightText: "#E9EDF7",
} as const;

/** Halo color for a concept ember, from mastery + decay state. */
export function masteryToColor(mastery: number, decaying?: boolean): string {
  if (decaying || mastery < 0.35) return palette.cinder;
  if (mastery < 0.75) return palette.flicker;
  return palette.ember;
}

export function masteryLabel(mastery: number, decaying?: boolean): string {
  if (decaying) return "fading — worth a revisit";
  if (mastery >= 0.75) return "glowing";
  if (mastery >= 0.35) return "catching";
  return "flickering";
}

/** Should the node flicker like a dying coal? */
export function isFlickering(mastery: number, decaying?: boolean): boolean {
  return !!decaying || mastery < 0.35;
}
