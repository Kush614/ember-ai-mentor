// The ◉ ember-dot: Ember's avatar. Breathes while idle, brightens while
// streaming — alive without a cartoon mascot.
export default function EmberDot({ size = 24, active = false }: { size?: number; active?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block rounded-full animate-breathe motion-only shrink-0"
      style={{
        width: size,
        height: size,
        background: "radial-gradient(circle at 42% 38%, #FFC46B 0%, #FF9E4A 55%, #B4552D 100%)",
        boxShadow: active
          ? "0 0 14px 3px rgba(255, 158, 74, 0.65)"
          : "0 0 8px 1px rgba(255, 158, 74, 0.35)",
        transition: "box-shadow 0.4s ease",
      }}
    />
  );
}
