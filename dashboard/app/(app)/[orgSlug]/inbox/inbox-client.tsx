"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Search,
  LayoutGrid,
  Rows3,
  Columns3,
  X,
  ExternalLink,
  Copy,
  Check,
  ArrowDownUp,
  Home,
  ChevronRight,
  Filter,
  MoreHorizontal,
} from "lucide-react";
import { cn, contributorColor, formatDate, shortUrl, timeAgo, dayKey } from "@/lib/utils";

type Project = { id: string; name: string; slug: string; color: string };
type Comment = {
  id: string;
  comment: string;
  selector: string;
  text: string | null;
  tagName: string | null;
  url: string;
  pageTitle: string | null;
  screenshotPath: string | null;
  screenshotWidth: number | null;
  screenshotHeight: number | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
  createdAt: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  projectSlug: string;
  contributorName: string | null;
  authorEmail: string;
};

type View = "grid" | "list" | "board";
type Sort = "newest" | "oldest";
type GroupBy = "project" | "contributor";

function parseList(v: string | null): string[] {
  return (v || "").split(",").map((s) => s.trim()).filter(Boolean);
}

export function InboxClient({
  orgSlug,
  projects,
  comments,
}: {
  orgSlug: string;
  projects: Project[];
  comments: Comment[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const qParam = sp.get("q") || "";
  const projectsSel = parseList(sp.get("projects"));
  const contributorsSel = parseList(sp.get("contributors"));
  const daySel = sp.get("day") || "";
  const viewParam = (sp.get("view") as View) || "grid";
  const sortParam = (sp.get("sort") as Sort) || "newest";
  const groupParam = (sp.get("group") as GroupBy) || "project";

  const [q, setQ] = useState(qParam);
  const [searchOpen, setSearchOpen] = useState(!!qParam);

  useEffect(() => {
    const t = setTimeout(() => {
      if (q !== qParam) updateParam("q", q || null);
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const contributors = useMemo(() => {
    const set = new Set<string>();
    for (const c of comments) if (c.contributorName) set.add(c.contributorName);
    return Array.from(set).sort();
  }, [comments]);

  const contributorCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of comments) {
      if (!c.contributorName) continue;
      m.set(c.contributorName, (m.get(c.contributorName) || 0) + 1);
    }
    return m;
  }, [comments]);

  // Unique days (newest first) for the left rail
  const days = useMemo(() => {
    const set = new Set<string>();
    for (const c of comments) set.add(dayKey(c.createdAt));
    return Array.from(set).sort((a, b) => (a > b ? -1 : 1)).slice(0, 21);
  }, [comments]);

  const filtered = useMemo(() => {
    const qLower = qParam.toLowerCase();
    return comments
      .filter((c) => (projectsSel.length ? projectsSel.includes(c.projectSlug) : true))
      .filter((c) =>
        contributorsSel.length
          ? contributorsSel.includes((c.contributorName || "").trim())
          : true
      )
      .filter((c) => (daySel ? dayKey(c.createdAt) === daySel : true))
      .filter((c) => {
        if (!qLower) return true;
        return (
          c.comment.toLowerCase().includes(qLower) ||
          c.url.toLowerCase().includes(qLower) ||
          (c.text || "").toLowerCase().includes(qLower) ||
          (c.pageTitle || "").toLowerCase().includes(qLower) ||
          (c.contributorName || "").toLowerCase().includes(qLower) ||
          c.selector.toLowerCase().includes(qLower)
        );
      });
  }, [comments, qParam, projectsSel, contributorsSel, daySel]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sortParam === "newest" ? diff : -diff;
    });
    return rows;
  }, [filtered, sortParam]);

  const stats = useMemo(() => {
    const todayKey = dayKey(new Date());
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const today = comments.filter((c) => dayKey(c.createdAt) === todayKey).length;
    const week = comments.filter((c) => new Date(c.createdAt).getTime() >= weekAgo).length;
    return {
      total: comments.length,
      shown: sorted.length,
      today,
      week,
      older: Math.max(0, comments.length - week),
    };
  }, [comments, sorted]);

  const latest = comments[0];
  const topContributors = useMemo(() => {
    return Array.from(contributorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [contributorCounts]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const active = activeId ? sorted.find((c) => c.id === activeId) || null : null;

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function toggleList(key: "projects" | "contributors", value: string) {
    const current = key === "projects" ? projectsSel : contributorsSel;
    const next = current.includes(value)
      ? current.filter((x) => x !== value)
      : [...current, value];
    updateParam(key, next.length ? next.join(",") : null);
  }

  function clearAll() {
    setQ("");
    const params = new URLSearchParams();
    if (viewParam !== "grid") params.set("view", viewParam);
    if (sortParam !== "newest") params.set("sort", sortParam);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const hasFilters =
    qParam || projectsSel.length > 0 || contributorsSel.length > 0 || daySel;

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[color:var(--color-surface)]">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6">
        {/* Top: breadcrumbs + icon toolbar */}
        <div className="flex items-center justify-between mb-5 gap-4">
          <nav className="flex items-center gap-1.5 text-sm text-[color:var(--color-ink-muted)] min-w-0">
            <Link href="/" className="hover:text-[color:var(--color-ink)]">
              <Home size={14} />
            </Link>
            <ChevronRight size={13} className="opacity-50" />
            <Link href={`/${orgSlug}/inbox`} className="hover:text-[color:var(--color-ink)] capitalize">
              {orgSlug}
            </Link>
            <ChevronRight size={13} className="opacity-50" />
            <span className="text-[color:var(--color-ink)]">Inbox</span>
          </nav>

          <div className="flex items-center gap-1.5">
            <IconButton
              active={searchOpen || !!qParam}
              onClick={() => setSearchOpen((s) => !s)}
              title="Rechercher"
            >
              <Search size={16} />
            </IconButton>
            <IconButton
              active={viewParam === "grid"}
              onClick={() => updateParam("view", null)}
              title="Grille"
            >
              <LayoutGrid size={16} />
            </IconButton>
            <IconButton
              active={viewParam === "list"}
              onClick={() => updateParam("view", "list")}
              title="Liste"
            >
              <Rows3 size={16} />
            </IconButton>
            <IconButton
              active={viewParam === "board"}
              onClick={() => updateParam("view", "board")}
              title="Tableau"
            >
              <Columns3 size={16} />
            </IconButton>
            <IconButton
              onClick={() => updateParam("sort", sortParam === "newest" ? "oldest" : null)}
              title="Tri"
            >
              <ArrowDownUp size={16} />
            </IconButton>
          </div>
        </div>

        {/* Title */}
        <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">Inbox</h1>
            <p className="text-sm text-[color:var(--color-ink-muted)] mt-1.5">
              {stats.shown === stats.total
                ? `${stats.total} retour${stats.total > 1 ? "s" : ""}`
                : `${stats.shown} / ${stats.total} retours`}
              {" · "}
              {projects.length} projet{projects.length > 1 ? "s" : ""}
              {" · "}
              {contributors.length} contributeur{contributors.length > 1 ? "s" : ""}
            </p>
          </div>

          {hasFilters && (
            <button
              onClick={clearAll}
              className="text-xs text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-white"
            >
              <X size={12} />
              Effacer les filtres
            </button>
          )}
        </div>

        {/* Search bar (collapsed by default) */}
        {searchOpen && (
          <div className="bg-white rounded-2xl border border-[color:var(--color-line)] px-4 py-2.5 mb-4 flex items-center gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <Search size={16} className="text-[color:var(--color-ink-muted)]" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Chercher un commentaire, une URL, un sélecteur…"
              className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-[color:var(--color-ink-muted)]"
              autoFocus
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Three-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[48px_340px_1fr] gap-4 items-start">
          {/* Day rail */}
          <div className="hidden lg:block sticky top-4">
            <DayRail
              days={days}
              selected={daySel}
              onSelect={(d) => updateParam("day", d || null)}
            />
          </div>

          {/* Left column — info cards */}
          <div className="space-y-4">
            <LatestCard comment={latest} onOpen={(id) => setActiveId(id)} />
            <SummaryCard stats={stats} />
            <ContributorsCard
              items={topContributors}
              selected={contributorsSel}
              onToggle={(name) => toggleList("contributors", name)}
            />
          </div>

          {/* Right — main panel */}
          <div className="bg-white rounded-2xl border border-[color:var(--color-line)] shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[color:var(--color-line)] flex items-center gap-2 flex-wrap">
              {projects.length > 0 &&
                projects.map((p) => (
                  <PillToggle
                    key={p.id}
                    active={projectsSel.includes(p.slug)}
                    onClick={() => toggleList("projects", p.slug)}
                    color={p.color}
                    dot
                  >
                    {p.name}
                  </PillToggle>
                ))}
              <span className="ml-auto text-xs text-[color:var(--color-ink-muted)] tabular-nums">
                {sorted.length} affiché{sorted.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="p-4">
              {sorted.length === 0 ? (
                <EmptyResults hasFilters={!!hasFilters} orgSlug={orgSlug} />
              ) : viewParam === "list" ? (
                <ListView comments={sorted} onSelect={setActiveId} />
              ) : viewParam === "board" ? (
                <BoardView
                  comments={sorted}
                  projects={projects}
                  contributors={contributors}
                  groupBy={groupParam}
                  onSelect={setActiveId}
                  onGroupChange={(g) => updateParam("group", g === "project" ? null : g)}
                />
              ) : (
                <GridView comments={sorted} onSelect={setActiveId} />
              )}
            </div>
          </div>
        </div>
      </div>

      {active && <Drawer comment={active} onClose={() => setActiveId(null)} />}
    </div>
  );
}

// ---------- Top-right icon button ----------

function IconButton({
  children,
  active,
  onClick,
  title,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "w-9 h-9 rounded-xl flex items-center justify-center transition-colors border",
        active
          ? "bg-white border-[color:var(--color-line)] text-[color:var(--color-ink)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          : "border-transparent text-[color:var(--color-ink-muted)] hover:bg-white hover:text-[color:var(--color-ink)]"
      )}
    >
      {children}
    </button>
  );
}

// ---------- Day rail (left) ----------

function DayRail({
  days,
  selected,
  onSelect,
}: {
  days: string[];
  selected: string;
  onSelect: (day: string) => void;
}) {
  if (days.length === 0) return null;
  return (
    <div className="flex flex-col items-center gap-2 py-2 text-sm tabular-nums">
      {days.map((d, i) => {
        const day = new Date(d + "T00:00:00");
        const num = day.getDate();
        const isActive = selected === d;
        const isToday = d === dayKey(new Date());
        return (
          <button
            key={d}
            onClick={() => onSelect(isActive ? "" : d)}
            title={day.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}
            className={cn(
              "relative w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
              isActive
                ? "bg-[color:var(--color-ink)] text-white"
                : isToday
                ? "text-[color:var(--color-ink)] hover:bg-white"
                : "text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] hover:bg-white"
            )}
          >
            {num}
            {isToday && !isActive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[color:var(--color-accent)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Left-column cards ----------

function LatestCard({
  comment,
  onOpen,
}: {
  comment: Comment | undefined;
  onOpen: (id: string) => void;
}) {
  if (!comment) {
    return (
      <div className="bg-white rounded-2xl border border-[color:var(--color-line)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="text-xs text-[color:var(--color-ink-muted)] uppercase tracking-wider font-medium mb-2">
          Dernier retour
        </div>
        <p className="text-sm text-[color:var(--color-ink-muted)]">Aucun retour pour l'instant.</p>
      </div>
    );
  }
  const date = new Date(comment.createdAt);
  return (
    <button
      onClick={() => onOpen(comment.id)}
      className="group w-full text-left bg-white rounded-2xl border border-[color:var(--color-line)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow relative overflow-hidden"
    >
      <div className="absolute top-3 right-3 flex flex-col items-center bg-[color:var(--color-accent)]/10 text-[color:var(--color-accent)] rounded-xl px-2 py-1 text-[10px] font-semibold leading-none">
        <span>{timeAgo(comment.createdAt).replace("il y a ", "")}</span>
        <span className="mt-0.5 text-[10px]">Live</span>
      </div>
      <div className="text-xs text-[color:var(--color-ink-muted)] uppercase tracking-wider font-medium mb-2">
        Dernier retour
      </div>
      <h3 className="text-sm font-semibold leading-snug line-clamp-2 mb-2 pr-14">
        {comment.comment}
      </h3>
      <div className="flex items-center gap-3 text-[11px] text-[color:var(--color-ink-muted)] mb-3">
        <span>
          {date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
        </span>
        <span>·</span>
        <span>{date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      <div className="flex items-center gap-2.5 pt-3 border-t border-[color:var(--color-line)]">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
          style={{
            background: contributorColor(comment.contributorName || "?").bg,
            color: contributorColor(comment.contributorName || "?").fg,
          }}
        >
          {(comment.contributorName || "?")
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((s) => s[0]?.toUpperCase())
            .join("")}
        </div>
        <div className="min-w-0">
          <div className="text-[10px] text-[color:var(--color-ink-muted)] leading-tight">
            Contributeur
          </div>
          <div className="text-sm font-medium truncate">{comment.contributorName || "—"}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
          style={{
            background: `${comment.projectColor}1a`,
            color: comment.projectColor,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: comment.projectColor }} />
          {comment.projectName}
        </span>
      </div>
    </button>
  );
}

function SummaryCard({
  stats,
}: {
  stats: { total: number; shown: number; today: number; week: number; older: number };
}) {
  const size = 120;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = stats.total || 1;

  // Stacked segments: today (orange), rest of this week (green), older (gray)
  const weekOnly = Math.max(0, stats.week - stats.today);
  const arcs = [
    { v: stats.today, color: "#ff6b35" },
    { v: weekOnly, color: "#4ade80" },
    { v: stats.older, color: "#e5e5e5" },
  ];

  let offset = 0;
  return (
    <div className="bg-white rounded-2xl border border-[color:var(--color-line)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-sm font-semibold">Résumé</div>
          <div className="text-xs text-[color:var(--color-ink-muted)]">
            Répartition des retours
          </div>
        </div>
        <button className="p-1 rounded-lg hover:bg-[color:var(--color-surface-2)] text-[color:var(--color-ink-muted)]">
          <MoreHorizontal size={14} />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="#f5f5f5"
              strokeWidth={stroke}
            />
            {arcs.map((arc, i) => {
              if (arc.v === 0) return null;
              const dash = (arc.v / total) * c;
              const seg = (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${dash} ${c}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              );
              offset += dash;
              return seg;
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-3xl font-semibold tracking-tight tabular-nums leading-none">
              {stats.total}
            </div>
            <div className="text-[11px] text-[color:var(--color-ink-muted)] mt-0.5">retours</div>
          </div>
        </div>

        <div className="flex-1 space-y-2 text-sm">
          <LegendRow color="#ff6b35" value={stats.today} label="Aujourd'hui" />
          <LegendRow color="#4ade80" value={weekOnly} label="Cette semaine" />
          <LegendRow color="#d4d4d4" value={stats.older} label="Plus ancien" />
        </div>
      </div>
    </div>
  );
}

function LegendRow({
  color,
  value,
  label,
}: {
  color: string;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="tabular-nums font-medium">{value}</span>
      <span className="text-[color:var(--color-ink-muted)] text-[13px]">{label}</span>
    </div>
  );
}

function ContributorsCard({
  items,
  selected,
  onToggle,
}: {
  items: [string, number][];
  selected: string[];
  onToggle: (name: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl border border-[color:var(--color-line)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-sm font-semibold">Contributeurs</div>
          <div className="text-xs text-[color:var(--color-ink-muted)]">
            Clique pour filtrer
          </div>
        </div>
      </div>

      <div className="space-y-1">
        {items.map(([name, count]) => {
          const isSel = selected.includes(name);
          const color = contributorColor(name);
          return (
            <button
              key={name}
              onClick={() => onToggle(name)}
              className={cn(
                "w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors",
                isSel
                  ? "bg-[color:var(--color-ink)] text-white"
                  : "hover:bg-[color:var(--color-surface-2)]"
              )}
            >
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
                style={{
                  background: isSel ? "rgba(255,255,255,0.15)" : color.bg,
                  color: isSel ? "#fff" : color.fg,
                }}
              >
                {name
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((s) => s[0]?.toUpperCase())
                  .join("")}
              </span>
              <span className="text-sm font-medium flex-1 truncate">{name}</span>
              <span
                className={cn(
                  "text-xs tabular-nums",
                  isSel ? "text-white/70" : "text-[color:var(--color-ink-muted)]"
                )}
              >
                {count}
              </span>
              {isSel && <Check size={14} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Pill toggle (project filter inside main panel) ----------

function PillToggle({
  active,
  onClick,
  color,
  dot,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color?: string;
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 pl-3 pr-1.5 py-1 rounded-full text-sm border transition-all",
        "bg-white hover:border-[color:var(--color-ink)]/20",
        active
          ? "border-[color:var(--color-ink)]/10 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          : "border-[color:var(--color-line)]"
      )}
    >
      {dot && color && (
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      )}
      <span className={cn("font-medium", !active && "text-[color:var(--color-ink-muted)]")}>
        {children}
      </span>
      <span
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
          active
            ? "bg-[color:var(--color-ink)] text-white"
            : "bg-[color:var(--color-surface-2)] text-transparent"
        )}
      >
        <Check size={12} strokeWidth={3} />
      </span>
    </button>
  );
}

// ---------- Views ----------

function GridView({ comments, onSelect }: { comments: Comment[]; onSelect: (id: string) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {comments.map((c) => (
        <CardFull key={c.id} c={c} onSelect={onSelect} />
      ))}
    </div>
  );
}

function ListView({ comments, onSelect }: { comments: Comment[]; onSelect: (id: string) => void }) {
  return (
    <div className="rounded-xl border border-[color:var(--color-line)] overflow-hidden">
      {comments.map((c, i) => (
        <RowItem
          key={c.id}
          c={c}
          last={i === comments.length - 1}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function BoardView({
  comments,
  projects,
  contributors,
  groupBy,
  onSelect,
  onGroupChange,
}: {
  comments: Comment[];
  projects: Project[];
  contributors: string[];
  groupBy: GroupBy;
  onSelect: (id: string) => void;
  onGroupChange: (g: GroupBy) => void;
}) {
  const columns =
    groupBy === "project"
      ? projects.map((p) => ({
          key: p.id,
          label: p.name,
          color: p.color,
          items: comments.filter((c) => c.projectId === p.id),
        }))
      : contributors.map((c) => ({
          key: c,
          label: c,
          color: contributorColor(c).fg,
          items: comments.filter((x) => x.contributorName === c),
        }));

  return (
    <div>
      <div className="flex items-center justify-end gap-2 mb-3">
        <span className="text-xs text-[color:var(--color-ink-muted)]">Grouper par</span>
        <div className="flex items-center gap-0.5 bg-[color:var(--color-surface-2)] rounded-lg p-0.5">
          <button
            onClick={() => onGroupChange("project")}
            className={cn(
              "px-3 py-1 rounded-md text-xs transition-colors",
              groupBy === "project"
                ? "bg-white text-[color:var(--color-ink)] shadow-sm"
                : "text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
            )}
          >
            Projet
          </button>
          <button
            onClick={() => onGroupChange("contributor")}
            className={cn(
              "px-3 py-1 rounded-md text-xs transition-colors",
              groupBy === "contributor"
                ? "bg-white text-[color:var(--color-ink)] shadow-sm"
                : "text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
            )}
          >
            Contributeur
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
        {columns
          .filter((col) => col.items.length > 0)
          .map((col) => (
            <div
              key={col.key}
              className="bg-[color:var(--color-surface-2)] rounded-xl p-3"
            >
              <div className="flex items-center justify-between px-1 mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: col.color }}
                  />
                  <h3 className="font-medium text-sm">{col.label}</h3>
                </div>
                <span className="text-xs text-[color:var(--color-ink-muted)] tabular-nums">
                  {col.items.length}
                </span>
              </div>
              <div className="space-y-2">
                {col.items.map((c) => (
                  <CardCompact key={c.id} c={c} onSelect={onSelect} />
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ---------- Card variants ----------

function ScreenshotThumb({ c, heightClass }: { c: Comment; heightClass?: string }) {
  if (!c.screenshotPath) {
    return (
      <div
        className={cn(
          "w-full bg-[color:var(--color-surface-2)] flex items-center justify-center text-xs text-[color:var(--color-ink-muted)] rounded-xl",
          heightClass || "h-40"
        )}
      >
        Pas de capture
      </div>
    );
  }
  return (
    <div
      className={cn(
        "relative w-full rounded-xl overflow-hidden border border-[color:var(--color-line)]",
        heightClass || "h-48"
      )}
      style={{
        background:
          "repeating-conic-gradient(#f4f4f4 0% 25%, #fafafa 0% 50%) 50% / 16px 16px",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/v1/uploads/${c.screenshotPath}`}
        alt=""
        className="w-full h-full object-contain"
      />
    </div>
  );
}

function ContributorAvatar({ name, size = 24 }: { name: string | null; size?: number }) {
  const color = contributorColor(name || "?");
  const initials = (name || "?")
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
      {initials}
    </span>
  );
}

function CardFull({ c, onSelect }: { c: Comment; onSelect: (id: string) => void }) {
  return (
    <button
      onClick={() => onSelect(c.id)}
      className="group text-left bg-white border border-[color:var(--color-line)] rounded-2xl overflow-hidden hover:shadow-md hover:border-[color:var(--color-ink)]/10 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
    >
      <div className="p-2.5 pb-0">
        <ScreenshotThumb c={c} heightClass="h-44" />
      </div>
      <div className="p-4 pt-3">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium"
            style={{
              background: `${c.projectColor}1a`,
              color: c.projectColor,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.projectColor }} />
            {c.projectName}
          </span>
          <span className="text-[11px] text-[color:var(--color-ink-muted)]">
            {timeAgo(c.createdAt)}
          </span>
        </div>

        <p className="text-sm leading-relaxed line-clamp-3 text-[color:var(--color-ink)]">
          {c.comment}
        </p>

        <div className="mt-3 pt-3 border-t border-[color:var(--color-line)] flex items-center gap-2">
          <ContributorAvatar name={c.contributorName} size={24} />
          <span className="text-xs font-medium truncate">{c.contributorName || "—"}</span>
        </div>
      </div>
    </button>
  );
}

function CardCompact({ c, onSelect }: { c: Comment; onSelect: (id: string) => void }) {
  return (
    <button
      onClick={() => onSelect(c.id)}
      className="group w-full text-left bg-white border border-[color:var(--color-line)] rounded-xl overflow-hidden hover:shadow-sm hover:border-[color:var(--color-ink)]/20 transition-all"
    >
      <div className="p-2">
        <ScreenshotThumb c={c} heightClass="h-24" />
      </div>
      <div className="px-3 pb-3">
        <p className="text-sm leading-snug line-clamp-2 text-[color:var(--color-ink)]">{c.comment}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <ContributorAvatar name={c.contributorName} size={20} />
            <span className="text-xs text-[color:var(--color-ink-muted)] truncate">
              {c.contributorName || "—"}
            </span>
          </div>
          <span className="text-[11px] text-[color:var(--color-ink-muted)]">{timeAgo(c.createdAt)}</span>
        </div>
      </div>
    </button>
  );
}

function RowItem({
  c,
  last,
  onSelect,
}: {
  c: Comment;
  last: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(c.id)}
      className={cn(
        "group w-full text-left px-4 py-3 flex items-start gap-4 hover:bg-[color:var(--color-surface-2)] transition-colors bg-white",
        !last && "border-b border-[color:var(--color-line)]"
      )}
    >
      <div
        className="flex-shrink-0 w-28 h-20 rounded-lg overflow-hidden border border-[color:var(--color-line)]"
        style={{
          background:
            "repeating-conic-gradient(#f4f4f4 0% 25%, #fafafa 0% 50%) 50% / 12px 12px",
        }}
      >
        {c.screenshotPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/v1/uploads/${c.screenshotPath}`}
            alt=""
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-[color:var(--color-ink-muted)]">
            —
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <ContributorAvatar name={c.contributorName} size={20} />
          <span className="text-sm font-medium truncate">{c.contributorName || "—"}</span>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{
              background: `${c.projectColor}1a`,
              color: c.projectColor,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.projectColor }} />
            {c.projectName}
          </span>
          <span className="text-xs text-[color:var(--color-ink-muted)] ml-auto whitespace-nowrap">
            {timeAgo(c.createdAt)}
          </span>
        </div>
        <p className="text-sm leading-relaxed line-clamp-2">{c.comment}</p>
        <div className="mt-1 text-xs text-[color:var(--color-ink-muted)] truncate font-mono">
          {shortUrl(c.url)}
        </div>
      </div>
    </button>
  );
}

function EmptyResults({ hasFilters, orgSlug }: { hasFilters: boolean; orgSlug: string }) {
  if (hasFilters) {
    return (
      <div className="p-16 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[color:var(--color-surface-2)] flex items-center justify-center text-[color:var(--color-ink-muted)]">
          <Filter size={18} />
        </div>
        <h3 className="text-lg font-medium mb-2">Aucun résultat</h3>
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          Essaie d'affiner ou d'effacer les filtres.
        </p>
      </div>
    );
  }
  return (
    <div className="p-16 text-center">
      <h3 className="text-lg font-medium mb-2">Aucun retour pour l'instant</h3>
      <p className="text-sm text-[color:var(--color-ink-muted)] max-w-sm mx-auto mb-6">
        Lance une session dans l'extension et commente un élément — les retours apparaîtront ici.
      </p>
      <Link
        href={`/${orgSlug}/projects`}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[color:var(--color-ink)] hover:opacity-90 text-white text-sm font-medium transition-opacity"
      >
        Voir les projets
      </Link>
    </div>
  );
}

// ---------- Drawer ----------

function Drawer({ comment, onClose }: { comment: Comment; onClose: () => void }) {
  const [copied, setCopied] = useState<"selector" | "url" | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function copy(text: string, kind: "selector" | "url") {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1200);
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        className="flex-1 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Fermer"
      />
      <aside className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="sticky top-0 bg-white border-b border-[color:var(--color-line)] px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 min-w-0">
            <ContributorAvatar name={comment.contributorName} size={28} />
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{comment.contributorName || "—"}</div>
              <div className="text-xs text-[color:var(--color-ink-muted)]">
                {formatDate(comment.createdAt)} · {timeAgo(comment.createdAt)}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[color:var(--color-surface-2)] text-[color:var(--color-ink-muted)]"
          >
            <X size={18} />
          </button>
        </div>

        {comment.screenshotPath && (
          <div
            className="border-b border-[color:var(--color-line)]"
            style={{
              background:
                "repeating-conic-gradient(#f4f4f4 0% 25%, #fafafa 0% 50%) 50% / 16px 16px",
            }}
          >
            <a
              href={`/api/v1/uploads/${comment.screenshotPath}`}
              target="_blank"
              rel="noreferrer"
              className="block"
              title="Ouvrir en grand"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/v1/uploads/${comment.screenshotPath}`}
                alt=""
                className="w-full max-h-[60vh] object-contain"
              />
            </a>
          </div>
        )}

        <div className="px-6 py-6 flex-1">
          <div className="flex items-center gap-2 mb-4">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{
                background: `${comment.projectColor}1a`,
                color: comment.projectColor,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: comment.projectColor }}
              />
              {comment.projectName}
            </span>
            {comment.tagName && (
              <span className="px-2 py-1 rounded-full text-xs font-mono bg-[color:var(--color-surface-2)] text-[color:var(--color-ink-muted)]">
                &lt;{comment.tagName}&gt;
              </span>
            )}
          </div>

          <p className="text-base leading-relaxed whitespace-pre-wrap">{comment.comment}</p>

          {comment.text && (
            <div className="mt-6">
              <div className="text-xs text-[color:var(--color-ink-muted)] uppercase tracking-wider font-medium mb-1.5">
                Texte de l'élément
              </div>
              <blockquote className="border-l-2 border-[color:var(--color-accent)] pl-4 py-1 text-sm italic text-[color:var(--color-ink-muted)]">
                &laquo;&nbsp;{comment.text}&nbsp;&raquo;
              </blockquote>
            </div>
          )}

          <div className="mt-6 space-y-3">
            <MetaRow label="Page">
              <a
                href={comment.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[color:var(--color-accent)] hover:underline truncate font-mono max-w-full"
                title={comment.url}
              >
                {shortUrl(comment.url)}
              </a>
              <button
                onClick={() => copy(comment.url, "url")}
                className="p-1 rounded hover:bg-[color:var(--color-surface-2)] text-[color:var(--color-ink-muted)]"
              >
                {copied === "url" ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </MetaRow>
            {comment.pageTitle && (
              <MetaRow label="Titre">
                <span className="text-sm truncate">{comment.pageTitle}</span>
              </MetaRow>
            )}
            <MetaRow label="Sélecteur CSS">
              <code className="text-xs font-mono text-[color:var(--color-ink)] truncate">
                {comment.selector}
              </code>
              <button
                onClick={() => copy(comment.selector, "selector")}
                className="p-1 rounded hover:bg-[color:var(--color-surface-2)] text-[color:var(--color-ink-muted)]"
              >
                {copied === "selector" ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </MetaRow>
            {comment.viewportWidth && comment.viewportHeight && (
              <MetaRow label="Viewport">
                <span className="text-sm text-[color:var(--color-ink-muted)]">
                  {comment.viewportWidth} × {comment.viewportHeight}
                </span>
              </MetaRow>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-[color:var(--color-line)] px-6 py-3 flex items-center justify-end gap-2">
          <a
            href={comment.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-hover)] px-4 py-2 rounded-xl transition-colors"
          >
            Ouvrir la page <ExternalLink size={14} />
          </a>
        </div>
      </aside>
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="text-xs text-[color:var(--color-ink-muted)] uppercase tracking-wider font-medium w-24 flex-shrink-0">
        {label}
      </span>
      <div className="flex items-center gap-2 min-w-0 flex-1">{children}</div>
    </div>
  );
}
