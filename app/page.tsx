import { signOut } from "./login/actions";

export default async function HomePage() {
  return (
    <main className="mx-auto max-w-5xl p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">TicketMafia</h1>
        <form action={signOut}>
          <button className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-100">
            Déconnexion
          </button>
        </form>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-slate-700">
          Projet en cours de setup. Les tickets apparaîtront ici une fois la synchro Slack branchée.
        </p>
      </section>
    </main>
  );
}
