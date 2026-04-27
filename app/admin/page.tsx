import Link from "next/link";
import { getAdminDashboard, type DashboardRange } from "@/lib/db/queries";
import { CategoryBadge, STATUS_LABEL, STATUS_ORDER, StatusBadge } from "@/components/badges";
import { OwnerBars, StatusDonut, WeeklyBars } from "@/components/AdminCharts";
import { RenameTitlesButton } from "@/components/RenameTitlesButton";
import { slackToPlainText } from "@/lib/slack/text";
import type { TicketCategory, TicketStatus } from "@/lib/slack/types";

const RANGE_FILTERS: { key: DashboardRange; label: string }[] = [
  { key: "7d", label: "7 jours" },
  { key: "30d", label: "30 jours" },
  { key: "90d", label: "90 jours" },
  { key: "all", label: "Tout" },
];

const RANGE_LABEL: Record<DashboardRange, string> = {
  "7d": "des 7 derniers jours",
  "30d": "des 30 derniers jours",
  "90d": "des 90 derniers jours",
  all: "depuis le début",
};

function isRange(v: unknown): v is DashboardRange {
  return v === "7d" || v === "30d" || v === "90d" || v === "all";
}

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<TicketCategory, string> = {
  bugs: "Bugs",
  features: "Features",
  super_admin: "Super-admin",
};

const CATEGORY_COLOR: Record<TicketCategory, { bg: string; chip: string }> = {
  bugs: { bg: "#ef4444", chip: "bg-red-500" },
  features: { bg: "#8b5cf6", chip: "bg-violet-500" },
  super_admin: { bg: "#6366f1", chip: "bg-indigo-500" },
};

const CATEGORIES: TicketCategory[] = ["bugs", "features", "super_admin"];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function KpiCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "neutral" | "danger" | "success";
}) {
  const toneClass =
    tone === "danger"
      ? "text-red-600"
      : tone === "success"
      ? "text-emerald-600"
      : "text-slate-900";
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function CategoryBar({ byCategory }: { byCategory: Record<TicketCategory, number> }) {
  const total = CATEGORIES.reduce((n, c) => n + byCategory[c], 0);

  return (
    <div>
      <div className="mb-2 flex h-6 overflow-hidden rounded bg-slate-100">
        {total > 0 &&
          CATEGORIES.map((c) => {
            const pct = (byCategory[c] / total) * 100;
            if (pct === 0) return null;
            return (
              <div
                key={c}
                className="flex items-center justify-center text-[10px] font-medium text-white"
                style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLOR[c].bg }}
              >
                {pct > 12 && `${Math.round(pct)}%`}
              </div>
            );
          })}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {CATEGORIES.map((c) => (
          <span key={c} className="flex items-center gap-1.5 text-slate-600">
            <span className={`inline-block h-2.5 w-2.5 rounded-sm ${CATEGORY_COLOR[c].chip}`} />
            {CATEGORY_LABEL[c]}
            <span className="tabular-nums font-medium text-slate-900">{byCategory[c]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function NumCell({ n, muteZero = true }: { n: number; muteZero?: boolean }) {
  return (
    <td
      className={`px-3 py-2 text-center tabular-nums ${
        muteZero && n === 0 ? "text-slate-300" : "text-slate-700"
      }`}
    >
      {n}
    </td>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const range: DashboardRange = isRange(rangeParam) ? rangeParam : "all";

  const data = await getAdminDashboard({ range });
  const { global, owners, weeklyCreated, oldestOpen, overdueList } = data;

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
          ← Tous les tickets
        </Link>
        <span className="text-xs text-slate-400">
          Mis à jour le {new Date().toLocaleString("fr-FR")}
        </span>
      </div>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-semibold">Admin — Dashboard</h1>
          <p className="text-sm text-slate-500">
            Vue d'ensemble des tickets, par owner et sur le temps.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <RenameTitlesButton />
          <nav className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {RANGE_FILTERS.map((f) => (
              <Link
                key={f.key}
                href={f.key === "all" ? "/admin" : `/admin?range=${f.key}`}
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
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Total tickets"
          value={global.total}
          hint={RANGE_LABEL[range]}
        />
        <KpiCard
          label="Ouverts"
          value={global.open}
          hint={`${global.byStatus.todo} à faire · ${global.byStatus.doing} en cours · ${global.byStatus.waiting} en attente`}
        />
        <KpiCard
          label="En retard"
          value={global.overdue}
          tone={global.overdue > 0 ? "danger" : "neutral"}
          hint="Deadline dépassée, non terminé"
        />
        <KpiCard
          label="Complétion"
          value={`${global.completionPct}%`}
          tone={global.completionPct >= 50 ? "success" : "neutral"}
          hint={`${global.byStatus.done} terminés`}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Par statut" subtitle="Répartition globale">
          <StatusDonut byStatus={global.byStatus} />
        </SectionCard>

        <SectionCard title="Par owner" subtitle="Charge et avancement">
          <OwnerBars rows={owners} />
        </SectionCard>

        <SectionCard
          title="Créés par semaine"
          subtitle={`8 dernières semaines · ${weeklyCreated.reduce((n, w) => n + w.count, 0)} tickets`}
        >
          <WeeklyBars weeks={weeklyCreated} />
          <div className="mt-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              Catégories
            </p>
            <CategoryBar byCategory={global.byCategory} />
          </div>
        </SectionCard>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Les plus vieux encore ouverts"
          subtitle="Top 5 des tickets non terminés les plus anciens"
        >
          {oldestOpen.length === 0 ? (
            <p className="rounded border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
              Rien ne traîne. 🎉
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {oldestOpen.map((t) => (
                <li key={t.id} className="py-2">
                  <Link href={`/tickets/${t.id}`} className="group block">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 group-hover:text-slate-700">
                          {slackToPlainText(t.title)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t.owner ? (
                            <span className="capitalize">{t.owner}</span>
                          ) : (
                            <span className="italic">Non assigné</span>
                          )}{" "}
                          · {formatDate(t.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-xs font-semibold text-slate-700">
                          {t.ageDays}j
                        </span>
                        <StatusBadge status={t.status} />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="En retard"
          subtitle={
            overdueList.length === 0
              ? "Aucun ticket en retard"
              : `${overdueList.length} ticket${overdueList.length > 1 ? "s" : ""} avec deadline dépassée`
          }
        >
          {overdueList.length === 0 ? (
            <p className="rounded border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
              Tout est dans les temps.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {overdueList.slice(0, 8).map((t) => (
                <li key={t.id} className="py-2">
                  <Link href={`/tickets/${t.id}`} className="group block">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 group-hover:text-slate-700">
                          {slackToPlainText(t.title)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t.owner ? (
                            <span className="capitalize">{t.owner}</span>
                          ) : (
                            <span className="italic">Non assigné</span>
                          )}{" "}
                          · deadline {formatDate(t.deadline)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-xs font-semibold text-red-600">
                          +{t.lateDays}j
                        </span>
                        <CategoryBadge category={t.category} />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
              {overdueList.length > 8 && (
                <li className="pt-2 text-center text-xs text-slate-400">
                  … et {overdueList.length - 8} autre{overdueList.length - 8 > 1 ? "s" : ""}
                </li>
              )}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Détail par owner"
        subtitle="Breakdown complet avec catégories et complétion"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Owner</th>
                <th className="px-3 py-2 text-center font-medium">Total</th>
                {STATUS_ORDER.map((s) => (
                  <th key={s} className="px-3 py-2 text-center font-medium">
                    {STATUS_LABEL[s]}
                  </th>
                ))}
                {CATEGORIES.map((c) => (
                  <th key={c} className="px-3 py-2 text-center font-medium">
                    {CATEGORY_LABEL[c]}
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-medium">En retard</th>
                <th className="px-3 py-2 text-left font-medium">Complétion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {owners.map((r) => (
                <tr key={r.name} className={r.isUnassigned ? "bg-slate-50/50" : ""}>
                  <td
                    className={`px-3 py-2 font-medium ${
                      r.isUnassigned ? "italic text-slate-500" : "capitalize text-slate-900"
                    }`}
                  >
                    {r.name}
                  </td>
                  <NumCell n={r.total} muteZero={false} />
                  {STATUS_ORDER.map((s) => (
                    <NumCell key={s} n={r.byStatus[s]} />
                  ))}
                  {CATEGORIES.map((c) => (
                    <NumCell key={c} n={r.byCategory[c]} />
                  ))}
                  <td
                    className={`px-3 py-2 text-center tabular-nums ${
                      r.overdue > 0 ? "font-medium text-red-600" : "text-slate-300"
                    }`}
                  >
                    {r.overdue}
                  </td>
                  <td className="px-3 py-2">
                    {r.total === 0 ? (
                      <span className="text-slate-300">—</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${r.completionPct}%` }}
                          />
                        </div>
                        <span className="w-9 text-right text-xs tabular-nums text-slate-600">
                          {r.completionPct}%
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </main>
  );
}
