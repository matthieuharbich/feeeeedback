import { initials } from "@/lib/utils";
import { cn } from "@/lib/utils";

const COLORS = [
  "bg-amber-100 text-amber-800",
  "bg-sky-100 text-sky-800",
  "bg-emerald-100 text-emerald-800",
  "bg-rose-100 text-rose-800",
  "bg-violet-100 text-violet-800",
  "bg-teal-100 text-teal-800",
  "bg-indigo-100 text-indigo-800",
];

function colorFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}

export function Avatar({
  name,
  email,
  image,
  size = 32,
  className,
}: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  size?: number;
  className?: string;
}) {
  const seed = (name || email || "?").toLowerCase();
  const color = colorFor(seed);
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold overflow-hidden flex-shrink-0",
        color,
        className
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.4) }}
      title={name || email || ""}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={name || ""} className="w-full h-full object-cover" />
      ) : (
        <span>{initials(name, email)}</span>
      )}
    </div>
  );
}
