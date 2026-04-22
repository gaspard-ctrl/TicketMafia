"use client";

import { useSearchParams } from "next/navigation";
import { login } from "@/app/login/actions";

export function LoginForm() {
  const error = useSearchParams().get("error");

  return (
    <form
      action={login}
      className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm"
    >
      <h1 className="mb-1 text-xl font-semibold">TicketMafia</h1>
      <p className="mb-6 text-sm text-slate-500">Mot de passe pour continuer.</p>

      <label className="mb-5 block">
        <span className="mb-1 block text-sm text-slate-700">Mot de passe</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          autoFocus
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </label>

      {error && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        className="w-full rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Se connecter
      </button>
    </form>
  );
}
