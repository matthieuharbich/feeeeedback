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
} from "lucide-react";
import { cn, contributorColor, formatDate, shortUrl, timeAgo, dayKey } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
  createdAt: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  projectSlug: string;
  contributorName: string | null;
  authorEmail: string;
};

type View = "grid" | "list";
type Range = "all" | "today" | "week";

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
  const rangeParam = (sp.get("range") as Range) || "all";
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

  function toggleList(key: "projects" | "contributors", value: string) {
    const current = key === "projects" ? projectsSel : contributorsSel;
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

  const rangeFiltered = useMemo(() => {
    if (rangeParam === "today") {
      const k = dayKey(new Date());
      return comments.filter((c) => dayKey(c.createdAt) === k);
    }
    if (rangeParam === "week") {
      const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
      return comments.filter((c) => new Date(c.createdAt).getTime() >= weekAgo);
    }
    return comments;
  }, [comments, rangeParam]);

  const filtered = useMemo(() => {
    const qLower = qParam.toLowerCase();
    return rangeFiltered
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
      })
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [rangeFiltered, qParam, projectsSel, contributorsSel]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const active = activeId ? filtered.find((c) => c.id === activeId) || null : null;

  const hasFilters =
    !!qParam || projectsSel.length > 0 || contributorsSel.length > 0;

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

      {/* Range tabs + search */}
      <div className="flex items-center justify-between gap-3 mt-6 flex-wrap">
        <Tabs
          value={rangeParam}
          onValueChange={(v) => updateParam("range", v === "all" ? null : v)}
        >
          <TabsList>
            <TabsTrigger value="all">Tous</TabsTrigger>
            <TabsTrigger value="week">Cette semaine</TabsTrigger>
            <TabsTrigger value="today">Aujourd'hui</TabsTrigger>
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
      {(projects.length > 0 || contributors.length > 0) && (
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
        </div>
      )}

      <Separator className="my-6" />

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyInbox hasFilters={hasFilters} orgSlug={orgSlug} />
      ) : viewParam === "list" ? (
        <ListView comments={filtered} onSelect={setActiveId} />
      ) : (
        <GridView comments={filtered} onSelect={setActiveId} />
      )}

      <Sheet
        open={!!active}
        onOpenChange={(o) => {
          if (!o) setActiveId(null);
        }}
      >
        <SheetContent className="sm:max-w-2xl w-full p-0 overflow-y-auto gap-0">
          {active && <DrawerBody comment={active} />}
        </SheetContent>
      </Sheet>
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
}: {
  comments: Comment[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {comments.map((c) => (
        <CommentCard key={c.id} c={c} onSelect={onSelect} />
      ))}
    </div>
  );
}

function ListView({
  comments,
  onSelect,
}: {
  comments: Comment[];
  onSelect: (id: string) => void;
}) {
  return (
    <Card className="overflow-hidden p-0">
      {comments.map((c, i) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={cn(
            "w-full text-left px-4 py-3 flex items-start gap-4 hover:bg-muted/60 transition-colors",
            i !== comments.length - 1 && "border-b"
          )}
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
      ))}
    </Card>
  );
}

function CommentCard({
  c,
  onSelect,
}: {
  c: Comment;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(c.id)}
      className="group text-left"
    >
      <Card className="overflow-hidden hover:shadow-md hover:border-foreground/10 transition-all p-0 gap-0">
        <div className="p-2 pb-0">
          <Thumb c={c} />
        </div>
        <CardContent className="px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <ProjectBadge c={c} />
            <span className="text-[11px] text-muted-foreground">
              {timeAgo(c.createdAt)}
            </span>
          </div>
          <p className="text-sm leading-relaxed line-clamp-3">{c.comment}</p>
          <div className="mt-3 pt-3 border-t flex items-center gap-2">
            <ContributorAvatar name={c.contributorName} size={22} />
            <span className="text-xs font-medium truncate">
              {c.contributorName || "—"}
            </span>
          </div>
        </CardContent>
      </Card>
    </button>
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

function DrawerBody({ comment }: { comment: Comment }) {
  const [copied, setCopied] = useState<"selector" | "url" | null>(null);

  async function copy(text: string, kind: "selector" | "url") {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1200);
  }

  return (
    <>
      <SheetHeader className="p-6 pb-4 border-b">
        <div className="flex items-center gap-3">
          <ContributorAvatar name={comment.contributorName} size={32} />
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-base font-medium">
              {comment.contributorName || "—"}
            </SheetTitle>
            <SheetDescription>
              {formatDate(comment.createdAt)} · {timeAgo(comment.createdAt)}
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

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

        <p className="text-base leading-relaxed whitespace-pre-wrap">
          {comment.comment}
        </p>

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

      <div className="sticky bottom-0 bg-background border-t p-4 flex justify-end">
        <Button asChild>
          <a href={comment.url} target="_blank" rel="noreferrer">
            Ouvrir la page <ExternalLink className="size-3.5" />
          </a>
        </Button>
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
