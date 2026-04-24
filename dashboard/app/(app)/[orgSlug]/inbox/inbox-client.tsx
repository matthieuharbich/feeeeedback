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

  const filtered = useMemo(() => {
    const qLower = qParam.toLowerCase();
    return comments
      .filter((c) => (projectsSel.length ? projectsSel.includes(c.projectSlug) : true))
      .filter((c) =>
        contributorsSel.length
          ? contributorsSel.includes((c.contributorName || "").trim())
          : true
      )
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
  }, [comments, qParam, projectsSel, contributorsSel]);

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
    };
  }, [comments, sorted]);

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

  const hasFilters = qParam || projectsSel.length > 0 || contributorsSel.length > 0;

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[color:var(--color-surface)]">
      <div className="max-w-[1500px] mx-auto px-4 md:px-10 py-8">
        {/* Breadcrumbs + icon toolbar */}
        <div className="flex items-center justify-between mb-4 gap-4">
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
            <button
              onClick={() => setSearchOpen((s) => !s)}
              className={cn(
                "p-2 rounded-xl border transition-colors",
                searchOpen || qParam
                  ? "bg-[color:var(--color-ink)] text-white border-[color:var(--color-ink)]"
                  : "bg-white border-[color:var(--color-line)] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
              )}
              title="Rechercher"
            >
              <Search size={16} />
            </button>
            <ViewSwitcher
              value={viewParam}
              onChange={(v) => updateParam("view", v === "grid" ? null : v)}
            />
            <button
              onClick={() => updateParam("sort", sortParam === "newest" ? "oldest" : null)}
              className="flex items-center gap-1.5 bg-white border border-[color:var(--color-line)] rounded-xl px-3 py-2 text-sm text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
              title="Changer le tri"
            >
              <ArrowDownUp size={14} />
              {sortParam === "newest" ? "Récents" : "Anciens"}
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="mb-6">
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

        {/* Search bar */}
        {searchOpen && (
          <div className="bg-white rounded-2xl border border-[color:var(--color-line)] px-4 py-2.5 mb-4 flex items-center gap-3 shadow-sm">
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

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard
            label="Total"
            value={stats.total}
            subtitle={`${stats.shown} affichés`}
            ringRatio={stats.total === 0 ? 0 : stats.shown / stats.total}
            ringColor="#ff6b35"
          />
          <StatCard
            label="Cette semaine"
            value={stats.week}
            subtitle={stats.week === 1 ? "retour capturé" : "retours capturés"}
            ringRatio={stats.total === 0 ? 0 : stats.week / stats.total}
            ringColor="#4ade80"
          />
          <StatCard
            label="Aujourd'hui"
            value={stats.today}
            subtitle={stats.today === 1 ? "nouveau retour" : "nouveaux retours"}
            ringRatio={stats.total === 0 ? 0 : stats.today / stats.total}
            ringColor="#3b82f6"
          />
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {projects.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {projects.map((p) => (
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
            </div>
          )}

          {projects.length > 0 && contributors.length > 0 && (
            <span className="h-6 w-px bg-[color:var(--color-line)] mx-1" />
          )}

          {contributors.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {contributors.map((c) => (
                <PillToggle
                  key={c}
                  active={contributorsSel.includes(c)}
                  onClick={() => toggleList("contributors", c)}
                  color={contributorColor(c).fg}
                  contributor={c}
                >
                  {c}
                </PillToggle>
              ))}
            </div>
          )}

          {hasFilters && (
            <button
              onClick={clearAll}
              className="ml-auto text-xs text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] flex items-center gap-1 px-2 py-1"
            >
              <X size={12} />
              Effacer
            </button>
          )}
        </div>

        {/* Content */}
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

      {active && <Drawer comment={active} onClose={() => setActiveId(null)} />}
    </div>
  );
}

// ---------- Small components ----------

function StatCard({
  label,
  value,
  subtitle,
  ringRatio,
  ringColor,
}: {
  label: string;
  value: number;
  subtitle: string;
  ringRatio: number;
  ringColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[color:var(--color-line)] p-5 flex items-center gap-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-[color:var(--color-ink-muted)] uppercase tracking-wider font-medium">
          {label}
        </div>
        <div className="text-3xl font-semibold tracking-tight mt-1 tabular-nums">{value}</div>
        <div className="text-xs text-[color:var(--color-ink-muted)] mt-1 truncate">{subtitle}</div>
      </div>
      <CircularProgress ratio={ringRatio} color={ringColor} size={56} />
    </div>
  );
}

function CircularProgress({
  ratio,
  color,
  size = 48,
}: {
  ratio: number;
  color: string;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(1, ratio || 0));
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * clamped;
  return (
    <svg width={size} height={size} className="flex-shrink-0" style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0f0f0" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${c}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 300ms ease" }}
      />
    </svg>
  );
}

function PillToggle({
  active,
  onClick,
  color,
  dot,
  contributor,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color?: string;
  dot?: boolean;
  contributor?: string;
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
      {contributor && <ContributorAvatar name={contributor} size={20} />}
      <span className={cn("font-medium", !active && "text-[color:var(--color-ink-muted)]")}>
        {children}
      </span>
      <span
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
          active ? "bg-[color:var(--color-ink)] text-white" : "bg-[color:var(--color-surface-2)] text-transparent"
        )}
      >
        <Check size={12} strokeWidth={3} />
      </span>
    </button>
  );
}

function ViewSwitcher({ value, onChange }: { value: View; onChange: (v: View) => void }) {
  const btn =
    "p-2 rounded-lg transition-colors text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]";
  const active = "!bg-[color:var(--color-ink)] !text-white hover:!text-white";
  return (
    <div className="flex items-center gap-0.5 bg-white border border-[color:var(--color-line)] rounded-xl p-0.5">
      <button
        onClick={() => onChange("grid")}
        className={cn(btn, value === "grid" && active)}
        title="Grille"
      >
        <LayoutGrid size={16} />
      </button>
      <button
        onClick={() => onChange("list")}
        className={cn(btn, value === "list" && active)}
        title="Liste"
      >
        <Rows3 size={16} />
      </button>
      <button
        onClick={() => onChange("board")}
        className={cn(btn, value === "board" && active)}
        title="Tableau"
      >
        <Columns3 size={16} />
      </button>
    </div>
  );
}

// ---------- Views ----------

function GridView({ comments, onSelect }: { comments: Comment[]; onSelect: (id: string) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {comments.map((c) => (
        <CardFull key={c.id} c={c} onSelect={onSelect} />
      ))}
    </div>
  );
}

function ListView({ comments, onSelect }: { comments: Comment[]; onSelect: (id: string) => void }) {
  return (
    <div className="bg-white rounded-2xl border border-[color:var(--color-line)] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
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
        <div className="flex items-center gap-0.5 bg-white border border-[color:var(--color-line)] rounded-lg p-0.5">
          <button
            onClick={() => onGroupChange("project")}
            className={cn(
              "px-3 py-1 rounded-md text-xs transition-colors",
              groupBy === "project"
                ? "bg-[color:var(--color-ink)] text-white"
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
                ? "bg-[color:var(--color-ink)] text-white"
                : "text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
            )}
          >
            Contributeur
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
        {columns
          .filter((col) => col.items.length > 0)
          .map((col) => (
            <div
              key={col.key}
              className="bg-[color:var(--color-surface-2)] rounded-2xl p-3"
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
              <div className="space-y-3">
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
      <div className="p-3 pb-0">
        <ScreenshotThumb c={c} heightClass="h-52" />
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
          <span className="text-[color:var(--color-ink-muted)] text-xs">·</span>
          <span className="text-xs text-[color:var(--color-ink-muted)] truncate font-mono">
            {shortUrl(c.url)}
          </span>
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
        <ScreenshotThumb c={c} heightClass="h-28" />
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
        "group w-full text-left px-4 py-3 flex items-start gap-4 hover:bg-[color:var(--color-surface-2)] transition-colors",
        !last && "border-b border-[color:var(--color-line)]"
      )}
    >
      <div
        className="flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden border border-[color:var(--color-line)]"
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
      <div className="bg-white border border-[color:var(--color-line)] rounded-2xl p-16 text-center">
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
    <div className="bg-white border border-[color:var(--color-line)] rounded-2xl p-16 text-center">
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
