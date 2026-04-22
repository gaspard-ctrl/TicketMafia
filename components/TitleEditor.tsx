"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { updateTicket } from "@/app/tickets/[id]/actions";
import { slackToPlainText } from "@/lib/slack/text";

type Props = {
  ticketId: string;
  title: string;
};

export function TitleEditor({ ticketId, title }: Props) {
  // Existing tickets may have a raw Slack-flavored title in DB
  // (e.g. "Hi <@U123|Lasitha>"). Display the cleaned version, and treat it
  // as the editable text so saving normalizes it.
  const display = useMemo(() => slackToPlainText(title), [title]);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(display);
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(display);
  }, [display]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [editing]);

  function save() {
    const next = draft.trim();
    if (next.length === 0 || next === display) {
      setDraft(display);
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", ticketId);
      fd.set("title", next);
      await updateTicket(fd);
      setEditing(false);
    });
  }

  function cancel() {
    setDraft(display);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="group mb-4 flex items-start gap-2">
        <h1 className="flex-1 text-2xl font-semibold leading-tight text-slate-900">
          {display}
        </h1>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-1 rounded px-2 py-1 text-xs text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100"
          aria-label="Modifier le titre"
        >
          ✏️ Modifier
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-col gap-2">
      <textarea
        ref={textareaRef}
        value={draft}
        disabled={pending}
        onChange={(e) => {
          setDraft(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = `${e.target.scrollHeight}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          } else if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            save();
          }
        }}
        rows={1}
        maxLength={300}
        className="w-full resize-none rounded border border-slate-300 bg-white px-3 py-2 text-2xl font-semibold leading-tight text-slate-900 focus:border-slate-500 focus:outline-none disabled:opacity-50"
      />
      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={save}
          disabled={pending || draft.trim().length === 0}
          className="rounded bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {pending ? "…" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          className="rounded px-3 py-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          Annuler
        </button>
        <span className="ml-auto text-slate-400">Entrée pour valider · Échap pour annuler</span>
      </div>
    </div>
  );
}
