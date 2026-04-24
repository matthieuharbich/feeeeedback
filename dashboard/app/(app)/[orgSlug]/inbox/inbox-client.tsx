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
  Filter,
  ArrowDownUp,
} from "lucide-react";
import { Avatar } from "@/components/avatar";
import { cn, contributorColor, formatDate, shortUrl, timeAgo } from "@/lib/utils";

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
  const projectParam = sp.get("project") || "";
  const contributorParam = sp.get("contributor") || "";
  const viewParam = (sp.get("view") as View) || "grid";
  const sortParam = (sp.get("sort") as Sort) || "newest";
  const groupParam = (sp.get("group") as GroupBy) || "project";

  const [q, setQ] = useState(qParam);

  // Sync local search input to URL (debounced)
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
      .filter((c) => (projectParam ? c.projectSlug === projectParam : true))
      .filter((c) =>
        contributorParam
          ? (c.contributorName || "").toLowerCase() === contributorParam.toLowerCase()
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
  }, [comments, qParam, projectParam, contributorParam]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sortParam === "newest" ? diff : -diff;
    });
    return rows;
  }, [filtered, sortParam]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const active = activeId ? sorted.find((c) => c.id === activeId) || null : null;

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const stats = {
    total: comments.length,
    shown: sorted.length,
    projects: new Set(sorted.map((c) => c.projectId)).size,
    contributors: new Set(sorted.map((c) => c.contributorName).filter(Boolean)).size,
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[color:var(--color-surface)]">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Inbox</h1>
            <p className="text-sm text-[color:var(--color-ink-muted)] mt-1">
              {stats.shown === stats.total
                ? `${stats.total} retour${stats.total > 1 ? "s" : ""}`
                : `${stats.shown} / ${stats.total} retours`}
              {" · "}
              {stats.projects} projet{stats.projects > 1 ? "s" : ""}
              {" · "}
              {stats.contributors} contributeur{stats.contributors > 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ViewSwitcher
              value={viewParam}
              onChange={(v) => updateParam("view", v === "grid" ? null : v)}
            />
            <SortToggle
              value={sortParam}
              onChange={(s) => updateParam("sort", s === "newest" ? null : s)}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-[color:var(--color-line)] p-3 mb-5 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search size={16} className="text-[color:var(--color-ink-muted)] ml-1" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Chercher un commentaire, un sélecteur, une URL…"
              className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-[color:var(--color-ink-muted)] py-1"
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

          <span className="h-6 w-px bg-[color:var(--color-line)] mx-1 hidden md:block" />

          <FilterMenu
            icon={<Filter size={13} />}
            label="Projet"
            options={[
              { value: "", label: "Tous les projets" },
              ...projects.map((p) => ({
                value: p.slug,
                label: p.name,
                dot: p.color,
              })),
            ]}
            selected={projectParam}
            onSelect={(v) => updateParam("project", v || null)}
          />

          <FilterMenu
            icon={<Filter size={13} />}
            label="Contributeur"
            options={[
              { value: "", label: "Tout le monde" },
              ...contributors.map((c) => ({ value: c, label: c })),
            ]}
            selected={contributorParam}
            onSelect={(v) => updateParam("contributor", v || null)}
          />

          {(projectParam || contributorParam || qParam) && (
            <button
              onClick={() => {
                setQ("");
                const params = new URLSearchParams();
                if (viewParam !== "grid") params.set("view", viewParam);
                if (sortParam !== "newest") params.set("sort", sortParam);
                router.replace(`${pathname}?${params.toString()}`, { scroll: false });
              }}
              className="text-xs text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] px-2 py-1"
            >
              Effacer
            </button>
          )}
        </div>

        {/* Active filter chips */}
        {(projectParam || contributorParam) && (
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            {projectParam && (
              <FilterChip
                label={projects.find((p) => p.slug === projectParam)?.name || projectParam}
                dot={projects.find((p) => p.slug === projectParam)?.color}
                onRemove={() => updateParam("project", null)}
              />
            )}
            {contributorParam && (
              <FilterChip label={contributorParam} onRemove={() => updateParam("contributor", null)} />
            )}
          </div>
        )}

        {/* Content */}
        {sorted.length === 0 ? (
          <EmptyResults
            hasFilters={!!(qParam || projectParam || contributorParam)}
            orgSlug={orgSlug}
          />
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

// ---------- View switcher + sort ----------

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

function SortToggle({ value, onChange }: { value: Sort; onChange: (s: Sort) => void }) {
  return (
    <button
      onClick={() => onChange(value === "newest" ? "oldest" : "newest")}
      className="flex items-center gap-1.5 bg-white border border-[color:var(--color-line)] rounded-xl px-3 py-2 text-sm text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
      title="Changer le tri"
    >
      <ArrowDownUp size={14} />
      {value === "newest" ? "Récents" : "Anciens"}
    </button>
  );
}

// ---------- Filter menu (lightweight dropdown) ----------

function FilterMenu({
  icon,
  label,
  options,
  selected,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  options: { value: string; label: string; dot?: string }[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeOption = options.find((o) => o.value === selected);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
          selected
            ? "bg-[color:var(--color-ink)] text-white hover:bg-[color:var(--color-ink)]/90"
            : "text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] hover:bg-[color:var(--color-surface-2)]"
        )}
      >
        {!selected && icon}
        {activeOption?.dot && (
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: activeOption.dot }}
          />
        )}
        {selected ? activeOption?.label : label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 min-w-[220px] bg-white border border-[color:var(--color-line)] rounded-xl shadow-lg py-1 z-40 max-h-[320px] overflow-y-auto">
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => {
                  onSelect(o.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm hover:bg-[color:var(--color-surface-2)]",
                  o.value === selected && "font-medium"
                )}
              >
                {o.dot && <span className="w-2 h-2 rounded-full" style={{ background: o.dot }} />}
                <span className="truncate flex-1">{o.label}</span>
                {o.value === selected && <Check size={14} className="text-[color:var(--color-accent)]" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FilterChip({
  label,
  dot,
  onRemove,
}: {
  label: string;
  dot?: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-white border border-[color:var(--color-line)] rounded-full pl-3 pr-1 py-1 text-xs">
      {dot && <span className="w-2 h-2 rounded-full" style={{ background: dot }} />}
      <span>{label}</span>
      <button
        onClick={onRemove}
        className="p-1 rounded-full hover:bg-[color:var(--color-surface-2)] text-[color:var(--color-ink-muted)]"
      >
        <X size={12} />
      </button>
    </span>
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
    <div className="bg-white rounded-2xl border border-[color:var(--color-line)] overflow-hidden">
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

function ContributorAvatar({ name }: { name: string | null }) {
  const color = contributorColor(name || "?");
  const initials = (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  return (
    <span
      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
      style={{ background: color.bg, color: color.fg }}
    >
      {initials}
    </span>
  );
}

function CardFull({ c, onSelect }: { c: Comment; onSelect: (id: string) => void }) {
  return (
    <button
      onClick={() => onSelect(c.id)}
      className="group text-left bg-white border border-[color:var(--color-line)] rounded-2xl overflow-hidden hover:shadow-md hover:border-[color:var(--color-ink)]/10 transition-all"
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
          <ContributorAvatar name={c.contributorName} />
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
            <ContributorAvatar name={c.contributorName} />
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
      <div className="flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden border border-[color:var(--color-line)]"
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
          <ContributorAvatar name={c.contributorName} />
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
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[color:var(--color-line)] px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 min-w-0">
            <ContributorAvatar name={comment.contributorName} />
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

        {/* Screenshot */}
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

        {/* Body */}
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

        {/* Footer actions */}
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
