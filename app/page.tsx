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

function isRange(v: unknown): v is DashboardRange {
  return v === "7d" || v === "30d" || v === "90d" || v === "all";
}

function buildHref(params: { category: "all" | TicketCategory; range: DashboardRange }): string {
  const sp = new URLSearchParams();
  if (params.category !== "all") sp.set("category", params.category);
  if (params.range !== "all") sp.set("range", params.range);
  const qs = sp.toString();
  return qs ? `/?${qs}` : "/";
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; range?: string }>;
}) {
  const { category: categoryParam, range: rangeParam } = await searchParams;
  const category: "all" | TicketCategory =
    VALID_CATEGORIES.includes(categoryParam as TicketCategory)
      ? (categoryParam as TicketCategory)
      : "all";
  const range: DashboardRange = isRange(rangeParam) ? rangeParam : "all";

  const tickets = await listTickets({ category, range });
  const counts: Record<TicketStatus, number> = { todo: 0, doing: 0, waiting: 0, done: 0 };
  for (const t of tickets) counts[t.status]++;

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">TicketMafia</h1>
        <div className="flex flex-wrap items-center gap-3">
          <nav className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {CATEGORY_FILTERS.map((f) => (
              <Link
                key={f.key}
                href={buildHref({ category: f.key, range })}
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
          <nav className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {RANGE_FILTERS.map((f) => (
              <Link
                key={f.key}
                href={buildHref({ category, range: f.key })}
                className={`rounded px-3 py-1 text-sm transition ${
                  range === f.key
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </nav>
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
