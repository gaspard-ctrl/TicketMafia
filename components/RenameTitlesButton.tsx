"use client";

import { useState, useTransition } from "react";
import { regenerateMissingTitles, type RenameResult } from "@/app/admin/actions";

export function RenameTitlesButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<RenameResult | null>(null);

  function onClick() {
    if (
      !confirm(
        "Lancer Claude pour générer un titre sur tous les tickets jamais renommés ? L'opération peut prendre plusieurs secondes."
      )
    )
      return;
    setResult(null);
    startTransition(async () => {
      const r = await regenerateMissingTitles();
      setResult(r);
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
      >
        {pending ? "Génération en cours…" : "🪄 Renommer avec Claude"}
      </button>
      {result && (
        <span className="text-xs text-slate-500">
          {result.total === 0
            ? "Tous les tickets sont déjà nommés."
            : `${result.processed} / ${result.total} ticket${result.total > 1 ? "s" : ""} renommé${result.processed > 1 ? "s" : ""}.`}
        </span>
      )}
    </div>
  );
}
