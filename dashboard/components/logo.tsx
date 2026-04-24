import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 group", className)}>
      <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--color-accent)]" />
      <span className="font-semibold tracking-tight">feeeeedback</span>
    </Link>
  );
}
