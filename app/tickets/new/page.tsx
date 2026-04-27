import Link from "next/link";
import { listOwners } from "@/lib/db/queries";
import { createTicket } from "./actions";

export const dynamic = "force-dynamic";

const CATEGORIES: { value: "bugs" | "features" | "super_admin"; label: string }[] = [
  { value: "bugs", label: "Bug" },
  { value: "features", label: "Feature" },
  { value: "super_admin", label: "Super-admin" },
];

export default async function NewTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, owners] = await Promise.all([searchParams, listOwners()]);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-4">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
          ← Tous les tickets
        </Link>
      </div>

      <h1 className="mb-1 text-2xl font-semibold">Nouveau ticket</h1>
      <p className="mb-6 text-sm text-slate-500">
        Crée un ticket directement dans l'app, sans passer par Slack.
      </p>

      <form
        action={createTicket}
        className="flex flex-col gap-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Catégorie
          </legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <label
                key={c.value}
                className="flex cursor-pointer items-center gap-2 rounded border border-slate-300 px-3 py-2 text-sm has-[:checked]:border-slate-900 has-[:checked]:bg-slate-900 has-[:checked]:text-white"
              >
                <input
                  type="radio"
                  name="category"
                  value={c.value}
                  required
                  defaultChecked={c.value === "bugs"}
                  className="sr-only"
                />
                {c.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Titre <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            name="title"
            required
            maxLength={300}
            placeholder="Ex: Bug sur le bouton de réservation"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Description
          </span>
          <textarea
            name="body"
            rows={6}
            placeholder="Détails du ticket — étapes pour reproduire, contexte, etc. Mrkdwn Slack supporté (*gras*, _italique_, `code`)."
            className="w-full resize-y rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </label>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Auteur <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              name="author"
              required
              maxLength={60}
              placeholder="Ton prénom"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Owner
            </span>
            <select
              name="owner"
              defaultValue=""
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm capitalize focus:border-slate-500 focus:outline-none"
            >
              <option value="">— aucun —</option>
              {owners.map((o) => (
                <option key={o.id} value={o.name} className="capitalize">
                  {o.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Deadline
            </span>
            <input
              type="date"
              name="deadline"
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </label>
        </div>

        {error && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {decodeURIComponent(error)}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <Link
            href="/"
            className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Annuler
          </Link>
          <button
            type="submit"
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Créer le ticket
          </button>
        </div>
      </form>
    </main>
  );
}
