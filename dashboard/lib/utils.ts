import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortUrl(u: string | null | undefined) {
  if (!u) return "";
  try {
    const url = new URL(u);
    return url.host + (url.pathname === "/" ? "" : url.pathname);
  } catch {
    return u;
  }
}

export function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 172800) return "hier";
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export function dayKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

export function contributorColor(seed: string) {
  const palette = [
    { bg: "#fef3c7", fg: "#92400e" },
    { bg: "#dbeafe", fg: "#1e40af" },
    { bg: "#d1fae5", fg: "#065f46" },
    { bg: "#fce7f3", fg: "#9d174d" },
    { bg: "#e0e7ff", fg: "#3730a3" },
    { bg: "#ccfbf1", fg: "#115e59" },
    { bg: "#fed7aa", fg: "#9a3412" },
    { bg: "#ede9fe", fg: "#5b21b6" },
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

export function initials(name: string | null | undefined, email?: string | null) {
  const source = name || email || "?";
  return source
    .split(/[\s@.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}
