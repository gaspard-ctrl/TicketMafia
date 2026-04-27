import Link from "next/link";
import { listTickets, type DashboardRange } from "@/lib/db/queries";
import { KanbanBoard } from "@/components/KanbanBoard";
import { STATUS_LABEL, STATUS_ORDER } from "@/components/badges";
import { ArchiveIcon } from "@/components/icons";
import type { TicketCategory, TicketStatus } from "@/lib/slack/types";
import { signOut } from "./login/actions";

const CATEGORY_FILTERS: { key: "all" | TicketCategory; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "bugs", label: "Bugs" },
  { key: "features", label: "Features" },
  { key: "super_admin", label: "Super-admin" },
];

const RANGE_FILTERS: { key: DashboardRange; label: string }[] = [
  { key: "7d", label: "7j" },
  { key: "30d", label: "30j" },
  { key: "90d", label: "90j" },
  { key: "all", label: "Tout" },
];

const VALID_CATEGORIES: TicketCategory[] = ["bugs", "features", "super_admin"];

type Sort = "desc" | "asc";

function isRange(v: unknown): v is DashboardRange {
  return v === "7d" || v === "30d" || v === "90d" || v === "all";
}

function isIsoDate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

type LinkParams = {
  category: "all" | TicketCategory;
  range: DashboardRange;
  sort: Sort;
  from?: string;
  to?: string;
};

function buildHref(params: LinkParams): string {
  const sp = new URLSearchParams();
  if (params.category !== "all") sp.set("category", params.category);
  if (params.range !== "all" && !params.from && !params.to) sp.set("range", params.range);
  if (params.sort !== "desc") sp.set("sort", params.sort);
  if (params.from) sp.set("from", params.from);
  if (params.to) sp.set("to", params.to);
  const qs = sp.toString();
  return qs ? `/?${qs}` : "/";
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    range?: string;
    sort?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const params = await searchParams;
  const category: "all" | TicketCategory =
    VALID_CATEGORIES.includes(params.category as TicketCategory)
      ? (params.category as TicketCategory)
      : "all";
  const range: DashboardRange = isRange(params.range) ? params.range : "all";
  const sort: Sort = params.sort === "asc" ? "asc" : "desc";
  const from = isIsoDate(params.from) ? params.from : undefined;
  const to = isIsoDate(params.to) ? params.to : undefined;
  const hasCustomRange = !!from || !!to;

  const tickets = await listTickets({ category, range, sort, from, to });
  const counts: Record<TicketStatus, number> = { todo: 0, doing: 0, waiting: 0, done: 0 };
  for (const t of tickets) counts[t.status]++;

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">TicketMafia</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/tickets/new"
            className="rounded bg-slate-900 px-3 py-1 text-sm font-medium text-white hover:bg-slate-800"
          >
            + Nouveau ticket
          </Link>
          <Link
            href="/admin"
            className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
          >
            Admin
          </Link>
          <Link
            href="/archive"
            className="inline-flex items-center gap-1.5 rounded border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
          >
            <ArchiveIcon className="h-4 w-4" />
            Archive
          </Link>
          <Link
            href="/settings"
            className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
          >
            Settings
          </Link>
          <form action={signOut}>
            <button className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-100">
              Déconnexion
            </button>
          </form>
        </div>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-2">
        <nav className="flex gap-1">
          {CATEGORY_FILTERS.map((f) => (
            <Link
              key={f.key}
              href={buildHref({ category: f.key, range, sort, from, to })}
              className={`rounded px-3 py-1 text-sm transition ${
                category === f.key
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </nav>

        <span className="h-6 w-px bg-slate-200" />

        <nav className="flex gap-1">
          {RANGE_FILTERS.map((f) => {
            const active = !hasCustomRange && range === f.key;
            return (
              <Link
                key={f.key}
                href={buildHref({ category, range: f.key, sort })}
                className={`rounded px-3 py-1 text-sm transition ${
                  active
                    ? "bg-slate-900 text-white"
                    : hasCustomRange
                    ? "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </nav>

        <span className="h-6 w-px bg-slate-200" />

        <form method="get" action="/" className="flex flex-wrap items-center gap-2">
          {category !== "all" && <input type="hidden" name="category" value={category} />}
          {sort !== "desc" && <input type="hidden" name="sort" value={sort} />}
          <label className="flex items-center gap-1 text-xs text-slate-500">
            Du
            <input
              type="date"
              name="from"
              defaultValue={from ?? ""}
              className="rounded border border-slate-300 px-2 py-0.5 text-sm"
            />
          </label>
          <label className="flex items-center gap-1 text-xs text-slate-500">
            Au
            <input
              type="date"
              name="to"
              defaultValue={to ?? ""}
              className="rounded border border-slate-300 px-2 py-0.5 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded bg-slate-900 px-3 py-1 text-sm font-medium text-white hover:bg-slate-800"
          >
            Appliquer
          </button>
          {hasCustomRange && (
            <Link
              href={buildHref({ category, range: "all", sort })}
              className="text-xs text-slate-500 underline hover:text-slate-700"
            >
              Effacer
            </Link>
          )}
        </form>

        <span className="ml-auto h-6 w-px bg-slate-200" />

        <nav className="flex gap-1" aria-label="Tri">
          <Link
            href={buildHref({ category, range, sort: "desc", from, to })}
            className={`rounded px-3 py-1 text-sm transition ${
              sort === "desc"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
            title="Plus récent en haut"
          >
            ↓ Récent
          </Link>
          <Link
            href={buildHref({ category, range, sort: "asc", from, to })}
            className={`rounded px-3 py-1 text-sm transition ${
              sort === "asc"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
            title="Plus ancien en haut"
          >
            ↑ Ancien
          </Link>
        </nav>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-600">
            Aucun ticket dans cette sélection. Essaie un autre filtre, ou envoie un message dans{" "}
            <code className="rounded bg-slate-100 px-1">#00-bugs-and-changes</code>,{" "}
            <code className="rounded bg-slate-100 px-1">#01-features-and-ideation</code>{" "}
            ou{" "}
            <code className="rounded bg-slate-100 px-1">#super-admin-dashboards</code>.
          </p>
        </div>
      ) : (
        <KanbanBoard tickets={tickets} />
      )}

      <p className="mt-6 text-xs text-slate-400">
        {tickets.length} ticket{tickets.length > 1 ? "s" : ""} —{" "}
        {STATUS_ORDER.map((s) => `${STATUS_LABEL[s]}: ${counts[s]}`).join(" · ")}
      </p>
    </main>
  );
}
