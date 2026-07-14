// Deterministic colored-letter avatar. Replaces emoji avatars project-wide.
// The RoomPlayer.avatar field is ignored by the rendering — color and letter
// are derived from the nickname, so nothing needs to be migrated.

const COLORS = [
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#d946ef",
  "#ec4899",
  "#0ea5e9",
];

export function avatarColor(seed: string): string {
  let h = 0;
  const s = seed || "?";
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function Avatar({
  name,
  size = 32,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const bg = avatarColor(name);
  const letter = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className={`inline-grid place-items-center rounded-full font-bold text-white leading-none ${className}`}
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize: Math.round(size * 0.45),
      }}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}
