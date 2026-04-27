"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Search,
  LayoutGrid,
  Rows3,
  X,
  ExternalLink,
  Copy,
  Check,
  Inbox,
  Filter,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn, formatDate, shortUrl, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ContributorAvatar } from "@/components/contributor-avatar";
import { PageHeader } from "@/components/page-header";

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
  status: string;
  actionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  projectSlug: string;
  contributorName: string | null;
  authorEmail: string;
};

type View = "grid" | "list";
type StatusFilter = "open" | "in_progress" | "resolved" | "archived" | "all";

const STATUS_LABELS: Record<string, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  resolved: "Résolu",
  archived: "Archivé",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-neutral-100 text-neutral-600 border-neutral-200",
};

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
  const urlsSel = parseList(sp.get("urls"));
  const statusParam = (sp.get("status") as StatusFilter) || "open";
  const viewParam = (sp.get("view") as View) || "grid";

  const [q, setQ] = useState(qParam);

  useEffect(() => {
    const t = setTimeout(() => {
      if (q !== qParam) updateParam("q", q || null);
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function toggleList(
    key: "projects" | "contributors" | "urls",
    value: string
  ) {
    const current =
      key === "projects"
        ? projectsSel
        : key === "contributors"
          ? contributorsSel
          : urlsSel;
    const next = current.includes(value)
      ? current.filter((x) => x !== value)
      : [...current, value];
    updateParam(key, next.length ? next.join(",") : null);
  }

  const contributors = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of comments) {
      if (!c.contributorName) continue;
      counts.set(c.contributorName, (counts.get(c.contributorName) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [comments]);

  const urls = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of comments) {
      if (!c.url) continue;
      counts.set(c.url, (counts.get(c.url) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [comments]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      open: 0,
      in_progress: 0,
      resolved: 0,
      archived: 0,
    };
    for (const c of comments) {
      if (counts[c.status] !== undefined) counts[c.status]++;
    }
    return counts;
  }, [comments]);

  const statusFiltered = useMemo(() => {
    if (statusParam === "all") return comments;
    return comments.filter((c) => c.status === statusParam);
  }, [comments, statusParam]);

  const filtered = useMemo(() => {
    const qLower = qParam.toLowerCase();
    return statusFiltered
      .filter((c) => (projectsSel.length ? projectsSel.includes(c.projectSlug) : true))
      .filter((c) =>
        contributorsSel.length
          ? contributorsSel.includes((c.contributorName || "").trim())
          : true
      )
      .filter((c) => (urlsSel.length ? urlsSel.includes(c.url) : true))
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
      })
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [statusFiltered, qParam, projectsSel, contributorsSel, urlsSel]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const active = activeId ? filtered.find((c) => c.id === activeId) || null : null;

  // Multi-select state for "copy as JSON" workflow
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  function selectAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((c) => next.add(c.id));
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function deselectAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((c) => next.delete(c.id));
      return next;
    });
  }

  const hasFilters =
    !!qParam ||
    projectsSel.length > 0 ||
    contributorsSel.length > 0 ||
    urlsSel.length > 0;

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1500px] mx-auto">
      <PageHeader
        title="Inbox"
        description={
          <>
            {filtered.length} retour{filtered.length > 1 ? "s" : ""}
            {hasFilters && ` · ${comments.length} au total`}
          </>
        }
        actions={
          <div className="flex items-center gap-1 border rounded-md p-0.5 bg-background">
            <Button
              size="icon"
              variant={viewParam === "grid" ? "secondary" : "ghost"}
              className="h-7 w-7"
              onClick={() => updateParam("view", null)}
              title="Grille"
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              size="icon"
              variant={viewParam === "list" ? "secondary" : "ghost"}
              className="h-7 w-7"
              onClick={() => updateParam("view", "list")}
              title="Liste"
            >
              <Rows3 className="size-4" />
            </Button>
          </div>
        }
      />

      {/* Status tabs + search */}
      <div className="flex items-center justify-between gap-3 mt-6 flex-wrap">
        <Tabs
          value={statusParam}
          onValueChange={(v) => updateParam("status", v === "open" ? null : v)}
        >
          <TabsList>
            <TabsTrigger value="open">
              Ouverts
              {statusCounts.open > 0 && (
                <span className="ml-1.5 text-xs tabular-nums opacity-60">
                  {statusCounts.open}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="in_progress">
              En cours
              {statusCounts.in_progress > 0 && (
                <span className="ml-1.5 text-xs tabular-nums opacity-60">
                  {statusCounts.in_progress}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="resolved">
              Résolus
              {statusCounts.resolved > 0 && (
                <span className="ml-1.5 text-xs tabular-nums opacity-60">
                  {statusCounts.resolved}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived">
              Archivés
              {statusCounts.archived > 0 && (
                <span className="ml-1.5 text-xs tabular-nums opacity-60">
                  {statusCounts.archived}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">Tous</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative flex-1 max-w-xs">
          <Search className="size-4 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Chercher…"
            className="pl-8 pr-8"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Pills */}
      {(projects.length > 0 || contributors.length > 0 || urls.length > 0) && (
        <div className="mt-4 space-y-3">
          {projects.length > 0 && (
            <FilterRow label="Projet">
              {projects.map((p) => {
                const active = projectsSel.includes(p.slug);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleList("projects", p.slug)}
                    className={cn(
                      "inline-flex items-center gap-2 h-7 pl-2 pr-3 rounded-full border text-sm transition-colors",
                      active
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background hover:bg-muted"
                    )}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: p.color }}
                    />
                    {p.name}
                  </button>
                );
              })}
            </FilterRow>
          )}

          {contributors.length > 0 && (
            <FilterRow label="Contributeur">
              {contributors.map(([name, count]) => {
                const active = contributorsSel.includes(name);
                return (
                  <button
                    key={name}
                    onClick={() => toggleList("contributors", name)}
                    className={cn(
                      "inline-flex items-center gap-2 h-7 pl-1 pr-3 rounded-full border text-sm transition-colors",
                      active
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background hover:bg-muted"
                    )}
                  >
                    <ContributorAvatar name={name} size={20} />
                    {name}
                    <span
                      className={cn(
                        "text-[11px] tabular-nums",
                        active ? "text-background/70" : "text-muted-foreground"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </FilterRow>
          )}

          {urls.length > 0 && (
            <FilterRow label="Page">
              {urls.map(([url, count]) => {
                const active = urlsSel.includes(url);
                return (
                  <button
                    key={url}
                    onClick={() => toggleList("urls", url)}
                    title={url}
                    className={cn(
                      "inline-flex items-center gap-2 h-7 pl-2.5 pr-2.5 rounded-full border text-sm transition-colors max-w-[280px]",
                      active
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background hover:bg-muted"
                    )}
                  >
                    <span className="font-mono text-xs truncate">
                      {shortUrl(url)}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] tabular-nums flex-shrink-0",
                        active ? "text-background/70" : "text-muted-foreground"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </FilterRow>
          )}
        </div>
      )}

      <Separator className="my-6" />

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyInbox hasFilters={hasFilters} orgSlug={orgSlug} />
      ) : viewParam === "list" ? (
        <ListView
          comments={filtered}
          onSelect={setActiveId}
          selected={selected}
          onToggleSelected={toggleSelected}
        />
      ) : (
        <GridView
          comments={filtered}
          onSelect={setActiveId}
          selected={selected}
          onToggleSelected={toggleSelected}
        />
      )}

      <SelectionBar
        comments={comments}
        selected={selected}
        allFilteredSelected={allFilteredSelected}
        onSelectAll={selectAllFiltered}
        onDeselectAll={deselectAllFiltered}
        onClear={clearSelection}
      />

      <Dialog
        open={!!active}
        onOpenChange={(o) => {
          if (!o) setActiveId(null);
        }}
      >
        <DialogContent
          className="sm:max-w-3xl w-full max-h-[90vh] overflow-hidden p-0 gap-0 flex flex-col"
          showCloseButton={false}
        >
          {active && (
            <DrawerBody
              comment={active}
              index={filtered.findIndex((c) => c.id === active.id)}
              total={filtered.length}
              onPrev={() => {
                const i = filtered.findIndex((c) => c.id === active.id);
                if (i > 0) setActiveId(filtered[i - 1].id);
              }}
              onNext={() => {
                const i = filtered.findIndex((c) => c.id === active.id);
                if (i < filtered.length - 1) setActiveId(filtered[i + 1].id);
              }}
              onClose={() => setActiveId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium w-24 flex-shrink-0">
        {label}
      </span>
      <div className="flex items-center gap-1.5 flex-wrap">{children}</div>
    </div>
  );
}

// ---------- Views ----------

function GridView({
  comments,
  onSelect,
  selected,
  onToggleSelected,
}: {
  comments: Comment[];
  onSelect: (id: string) => void;
  selected: Set<string>;
  onToggleSelected: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {comments.map((c) => (
        <CommentCard
          key={c.id}
          c={c}
          onSelect={onSelect}
          checked={selected.has(c.id)}
          onCheckedChange={() => onToggleSelected(c.id)}
        />
      ))}
    </div>
  );
}

function ListView({
  comments,
  onSelect,
  selected,
  onToggleSelected,
}: {
  comments: Comment[];
  onSelect: (id: string) => void;
  selected: Set<string>;
  onToggleSelected: (id: string) => void;
}) {
  return (
    <Card className="overflow-hidden p-0">
      {comments.map((c, i) => {
        const checked = selected.has(c.id);
        return (
          <div
            key={c.id}
            className={cn(
              "px-4 py-3 flex items-start gap-3 hover:bg-muted/60 transition-colors",
              i !== comments.length - 1 && "border-b",
              checked && "bg-primary/5"
            )}
          >
            <div className="pt-1.5">
              <Checkbox
                checked={checked}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelected(c.id);
                }}
              />
            </div>
            <button
              onClick={() => onSelect(c.id)}
              className="flex-1 min-w-0 flex items-start gap-4 text-left"
            >
              <Thumb c={c} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <ContributorAvatar name={c.contributorName} size={20} />
                  <span className="text-sm font-medium truncate">
                    {c.contributorName || "—"}
                  </span>
                  <ProjectBadge c={c} />
                  <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                    {timeAgo(c.createdAt)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed line-clamp-2">{c.comment}</p>
                <div className="mt-1 text-xs text-muted-foreground truncate font-mono">
                  {shortUrl(c.url)}
                </div>
              </div>
            </button>
          </div>
        );
      })}
    </Card>
  );
}

function CommentCard({
  c,
  onSelect,
  checked,
  onCheckedChange,
}: {
  c: Comment;
  onSelect: (id: string) => void;
  checked: boolean;
  onCheckedChange: () => void;
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden hover:shadow-md hover:border-foreground/10 transition-all p-0 gap-0 relative",
        checked && "ring-2 ring-primary"
      )}
    >
      <div
        className={cn(
          "absolute top-3 left-3 z-10 transition-opacity",
          checked ? "opacity-100" : "opacity-0 group-hover/card:opacity-100"
        )}
      >
        <div className="bg-background/95 backdrop-blur rounded-md p-1 shadow-sm border">
          <Checkbox checked={checked} onClick={onCheckedChange} />
        </div>
      </div>
      <button
        onClick={() => onSelect(c.id)}
        className="group/card text-left w-full"
      >
        <div className="p-2 pb-0">
          <Thumb c={c} />
        </div>
        <CardContent className="px-4 py-3">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <ProjectBadge c={c} />
            {c.status !== "open" && (
              <Badge
                variant="outline"
                className={cn("h-5 px-2 text-[10px] capitalize", STATUS_COLORS[c.status])}
              >
                {STATUS_LABELS[c.status]}
              </Badge>
            )}
            <span className="text-[11px] text-muted-foreground ml-auto">
              {timeAgo(c.createdAt)}
            </span>
          </div>
          <p className="text-sm leading-relaxed line-clamp-3">{c.comment}</p>
          {c.actionNote && (
            <div className="mt-2 text-xs text-foreground/80 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 line-clamp-2">
              <span className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold mr-1.5">
                Action
              </span>
              {c.actionNote}
            </div>
          )}
          <div className="mt-3 pt-3 border-t flex items-center gap-2">
            <ContributorAvatar name={c.contributorName} size={22} />
            <span className="text-xs font-medium truncate">
              {c.contributorName || "—"}
            </span>
          </div>
        </CardContent>
      </button>
    </Card>
  );
}

// ---------- JSON export + selection bar ----------

function buildJsonExport(comments: Comment[]) {
  return {
    tool: "feeeeedback",
    version: 2,
    exportedAt: new Date().toISOString(),
    prompt: [
      "Tu reçois une liste de retours capturés sur un site live via l'extension feeeeedback.",
      "Pour chaque item :",
      "- `feedback` : ce qu'un utilisateur (champ `from`) a remonté en pointant un élément précis de la page. C'est sa voix, brute.",
      "- `action` : ce que moi (Product Owner) je te demande de faire en réponse. C'est l'instruction à exécuter.",
      "- `element.selector` te permet de cibler exactement l'élément concerné.",
      "- `page.url` est la page où le retour a été pris ; utilise-la pour retrouver le composant dans le code.",
      "Concentre-toi sur le champ `action` pour savoir quoi coder. Le `feedback` te donne le pourquoi.",
      "Ignore les items dont `status` vaut `archived` ou `resolved` sauf demande explicite.",
    ].join("\n"),
    count: comments.length,
    items: comments.map((c) => ({
      feedback: c.comment,
      action: c.actionNote || null,
      from: c.contributorName || null,
      project: c.projectName,
      status: c.status,
      page: {
        url: c.url,
        title: c.pageTitle || null,
        viewport:
          c.viewportWidth && c.viewportHeight
            ? { width: c.viewportWidth, height: c.viewportHeight }
            : null,
      },
      element: {
        selector: c.selector,
        tag: c.tagName || null,
        text: c.text || null,
      },
      createdAt: c.createdAt,
    })),
  };
}

function SelectionBar({
  comments,
  selected,
  allFilteredSelected,
  onSelectAll,
  onDeselectAll,
  onClear,
}: {
  comments: Comment[];
  selected: Set<string>;
  allFilteredSelected: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onClear: () => void;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  if (selected.size === 0) return null;

  const selectedComments = comments.filter((c) => selected.has(c.id));
  const selectedIds = selectedComments.map((c) => c.id);

  async function copyJson() {
    const payload = buildJsonExport(selectedComments);
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function bulkStatus(status: string, label: string) {
    setBusy(label);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/v1/comments/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          })
        )
      );
      onClear();
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="bg-foreground text-background rounded-xl shadow-2xl px-2 py-2 flex items-center gap-1 flex-wrap max-w-[95vw]">
        <span className="px-3 text-sm font-medium tabular-nums">
          {selected.size} sélectionné{selected.size > 1 ? "s" : ""}
        </span>
        <span className="w-px h-5 bg-background/20" />
        <Button
          size="sm"
          variant="ghost"
          className="text-background hover:bg-background/10 hover:text-background"
          onClick={allFilteredSelected ? onDeselectAll : onSelectAll}
        >
          {allFilteredSelected ? "Désélectionner la vue" : "Sélectionner la vue"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-background hover:bg-background/10 hover:text-background"
          onClick={onClear}
        >
          Effacer
        </Button>
        <span className="w-px h-5 bg-background/20" />
        <Button
          size="sm"
          variant="ghost"
          disabled={!!busy}
          className="text-background hover:bg-background/10 hover:text-background"
          onClick={() => bulkStatus("in_progress", "in_progress")}
        >
          {busy === "in_progress" ? "…" : "En cours"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={!!busy}
          className="text-background hover:bg-background/10 hover:text-background"
          onClick={() => bulkStatus("resolved", "resolved")}
        >
          {busy === "resolved" ? "…" : "Résoudre"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={!!busy}
          className="text-background hover:bg-background/10 hover:text-background"
          onClick={() => bulkStatus("archived", "archived")}
        >
          {busy === "archived" ? "…" : "Archiver"}
        </Button>
        <span className="w-px h-5 bg-background/20" />
        <Button
          size="sm"
          variant="secondary"
          onClick={copyJson}
          className="bg-background text-foreground hover:bg-background/90"
        >
          {copied ? (
            <>
              <ClipboardCheck className="size-3.5" /> Copié pour Claude
            </>
          ) : (
            <>
              <Copy className="size-3.5" /> Copier en JSON
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function Thumb({ c, size = "md" }: { c: Comment; size?: "sm" | "md" }) {
  const dims =
    size === "sm"
      ? "w-28 h-20 rounded-md"
      : "w-full h-44 rounded-lg";
  const bg = {
    background:
      "repeating-conic-gradient(color-mix(in srgb, var(--muted) 90%, transparent) 0% 25%, var(--muted) 0% 50%) 50% / 12px 12px",
  };

  if (!c.screenshotPath) {
    return (
      <div
        className={cn(
          dims,
          "flex-shrink-0 border flex items-center justify-center text-[10px] text-muted-foreground"
        )}
        style={bg}
      >
        —
      </div>
    );
  }
  return (
    <div
      className={cn(dims, "flex-shrink-0 border overflow-hidden relative")}
      style={bg}
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

function ProjectBadge({ c }: { c: Comment }) {
  return (
    <Badge
      variant="outline"
      className="gap-1 h-5 px-2 font-medium"
      style={{
        background: `${c.projectColor}1a`,
        color: c.projectColor,
        borderColor: `${c.projectColor}33`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: c.projectColor }}
      />
      {c.projectName}
    </Badge>
  );
}

function EmptyInbox({
  hasFilters,
  orgSlug,
}: {
  hasFilters: boolean;
  orgSlug: string;
}) {
  return (
    <Card className="p-16 text-center">
      <div className="size-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
        {hasFilters ? <Filter className="size-5" /> : <Inbox className="size-5" />}
      </div>
      <h3 className="text-lg font-medium mb-2">
        {hasFilters ? "Aucun résultat" : "Aucun retour pour l'instant"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
        {hasFilters
          ? "Essaie d'affiner ou d'effacer les filtres."
          : "Lance une session dans l'extension et commente un élément — les retours apparaîtront ici."}
      </p>
      {!hasFilters && (
        <Button asChild>
          <Link href={`/${orgSlug}/projects`}>Voir les projets</Link>
        </Button>
      )}
    </Card>
  );
}

// ---------- Drawer body ----------

function DrawerBody({
  comment,
  index,
  total,
  onPrev,
  onNext,
  onClose,
}: {
  comment: Comment;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState<"selector" | "url" | null>(null);
  const [actionDraft, setActionDraft] = useState(comment.actionNote || "");
  const [actionDirty, setActionDirty] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  useEffect(() => {
    setActionDraft(comment.actionNote || "");
    setActionDirty(false);
  }, [comment.id, comment.actionNote]);

  // Keyboard navigation: ← / → to flip between cards
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Skip if typing in textarea/input
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "TEXTAREA" ||
          target.tagName === "INPUT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (index > 0) onPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (index < total - 1) onNext();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, total, onPrev, onNext]);

  async function copy(text: string, kind: "selector" | "url") {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1200);
  }

  async function saveAction() {
    if (!actionDirty) return;
    setActionSaving(true);
    try {
      const res = await fetch(`/api/v1/comments/${comment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionNote: actionDraft.trim() || null }),
      });
      if (!res.ok) throw new Error(await res.text());
      setActionDirty(false);
      router.refresh();
    } finally {
      setActionSaving(false);
    }
  }

  async function setStatus(next: string) {
    setStatusBusy(true);
    try {
      const res = await fetch(`/api/v1/comments/${comment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } finally {
      setStatusBusy(false);
    }
  }

  const statusActions: Array<{ value: string; label: string }> = [
    { value: "open", label: "Ouvert" },
    { value: "in_progress", label: "En cours" },
    { value: "resolved", label: "Résolu" },
    { value: "archived", label: "Archivé" },
  ];

  return (
    <>
      <div className="p-5 pb-4 border-b flex items-center gap-3 flex-shrink-0">
        <ContributorAvatar name={comment.contributorName} size={32} />
        <div className="min-w-0 flex-1">
          <div className="text-base font-medium leading-tight">
            {comment.contributorName || "—"}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDate(comment.createdAt)} · {timeAgo(comment.createdAt)}
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "h-6 px-2 font-medium capitalize",
            STATUS_COLORS[comment.status] || ""
          )}
        >
          {STATUS_LABELS[comment.status] || comment.status}
        </Badge>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onClose}
          className="ml-1"
          aria-label="Fermer"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="overflow-y-auto flex-1">
      {comment.screenshotPath && (
        <div
          className="border-b"
          style={{
            background:
              "repeating-conic-gradient(color-mix(in srgb, var(--muted) 90%, transparent) 0% 25%, var(--muted) 0% 50%) 50% / 14px 14px",
          }}
        >
          <a
            href={`/api/v1/uploads/${comment.screenshotPath}`}
            target="_blank"
            rel="noreferrer"
            className="block"
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

      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2 flex-wrap">
          <ProjectBadge c={comment} />
          {comment.tagName && (
            <Badge variant="outline" className="font-mono h-5">
              &lt;{comment.tagName}&gt;
            </Badge>
          )}
        </div>

        {/* Feedback (from contributor — read-only) */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              Feedback
            </div>
            <span className="text-[10px] text-muted-foreground">
              {comment.contributorName || "—"}
            </span>
          </div>
          <p className="text-base leading-relaxed whitespace-pre-wrap rounded-lg bg-muted/40 p-3.5 border">
            {comment.comment}
          </p>
        </section>

        {/* Action — editable PO note */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              Action à prendre
            </div>
            {actionDirty && (
              <span className="text-[10px] text-amber-600">Non enregistré</span>
            )}
          </div>
          <Textarea
            value={actionDraft}
            onChange={(e) => {
              setActionDraft(e.target.value);
              setActionDirty(true);
            }}
            onBlur={saveAction}
            placeholder="Décris l'action à prendre — cette note sera incluse dans l'export JSON pour Claude Code."
            rows={4}
            className="resize-y"
          />
          {actionDirty && (
            <div className="flex justify-end mt-2">
              <Button size="sm" onClick={saveAction} disabled={actionSaving}>
                {actionSaving ? "…" : "Enregistrer"}
              </Button>
            </div>
          )}
        </section>

        {/* Status workflow */}
        <section>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
            Statut
          </div>
          <div className="flex flex-wrap gap-1.5">
            {statusActions.map((s) => {
              const active = comment.status === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => !active && setStatus(s.value)}
                  disabled={statusBusy}
                  className={cn(
                    "h-7 px-3 rounded-full border text-xs font-medium transition-colors disabled:opacity-50",
                    active
                      ? STATUS_COLORS[s.value] + " ring-2 ring-offset-1 ring-offset-background"
                      : "bg-background hover:bg-muted text-muted-foreground"
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </section>

        {comment.text && (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
              Texte de l'élément
            </div>
            <blockquote className="border-l-2 border-[color:var(--brand)] pl-4 py-1 text-sm italic text-muted-foreground">
              &laquo;&nbsp;{comment.text}&nbsp;&raquo;
            </blockquote>
          </div>
        )}

        <Separator />

        <div className="space-y-2.5">
          <MetaRow label="Page">
            <a
              href={comment.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[color:var(--brand)] hover:underline truncate font-mono"
              title={comment.url}
            >
              {shortUrl(comment.url)}
            </a>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => copy(comment.url, "url")}
            >
              {copied === "url" ? <Check className="size-3" /> : <Copy className="size-3" />}
            </Button>
          </MetaRow>
          {comment.pageTitle && (
            <MetaRow label="Titre">
              <span className="text-sm truncate">{comment.pageTitle}</span>
            </MetaRow>
          )}
          <MetaRow label="Sélecteur">
            <code className="text-xs font-mono truncate">{comment.selector}</code>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => copy(comment.selector, "selector")}
            >
              {copied === "selector" ? <Check className="size-3" /> : <Copy className="size-3" />}
            </Button>
          </MetaRow>
          {comment.viewportWidth && comment.viewportHeight && (
            <MetaRow label="Viewport">
              <span className="text-sm text-muted-foreground">
                {comment.viewportWidth} × {comment.viewportHeight}
              </span>
            </MetaRow>
          )}
        </div>
      </div>

      </div>

      <div className="border-t bg-background p-3 flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          variant="ghost"
          onClick={onPrev}
          disabled={index <= 0}
          aria-label="Précédent"
        >
          <ChevronLeft className="size-4" /> Précédent
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums px-2">
          {index + 1} / {total}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={onNext}
          disabled={index >= total - 1}
          aria-label="Suivant"
        >
          Suivant <ChevronRight className="size-4" />
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">←</kbd>{" "}
            <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">→</kbd>
          </span>
          <Button asChild size="sm">
            <a href={comment.url} target="_blank" rel="noreferrer">
              Ouvrir la page <ExternalLink className="size-3.5" />
            </a>
          </Button>
        </div>
      </div>
    </>
  );
}

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium w-20 flex-shrink-0">
        {label}
      </span>
      <div className="flex items-center gap-1.5 min-w-0 flex-1">{children}</div>
    </div>
  );
}
