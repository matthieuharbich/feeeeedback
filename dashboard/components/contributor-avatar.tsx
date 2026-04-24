import { contributorColor } from "@/lib/utils";

export function ContributorAvatar({
  name,
  size = 24,
}: {
  name: string | null | undefined;
  size?: number;
}) {
  const color = contributorColor(name || "?");
  const ini = (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  return (
    <span
      className="rounded-full flex items-center justify-center font-semibold flex-shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(9, size * 0.38),
        background: color.bg,
        color: color.fg,
      }}
    >
      {ini}
    </span>
  );
}
