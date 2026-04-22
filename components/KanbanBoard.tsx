"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { moveTicket } from "@/app/actions";
import { CategoryBadge, STATUS_LABEL, STATUS_ORDER, StatusBadge } from "@/components/badges";
import { DeleteTicketButton } from "@/components/DeleteTicketButton";
import type { TicketRow } from "@/lib/db/queries";
import { slackToPlainText } from "@/lib/slack/text";
import type { TicketStatus } from "@/lib/slack/types";

function formatDeadline(deadline: string | null): string | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

type Move = { id: string; status: TicketStatus };

export function KanbanBoard({ tickets }: { tickets: TicketRow[] }) {
  const [, startTransition] = useTransition();
  const [optimisticTickets, applyMove] = useOptimistic(
    tickets,
    (state: TicketRow[], move: Move) =>
      state.map((t) => (t.id === move.id ? { ...t, status: move.status } : t))
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<TicketStatus | null>(null);

  const byStatus: Record<TicketStatus, TicketRow[]> = {
    todo: [],
    doing: [],
    waiting: [],
    done: [],
  };
  for (const t of optimisticTickets) byStatus[t.status].push(t);

  function onDragStart(e: React.DragEvent, id: string) {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }

  function onDragOver(e: React.DragEvent, status: TicketStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOver !== status) setDragOver(status);
  }

  function onDrop(e: React.DragEvent, status: TicketStatus) {
    e.preventDefault();
    const id = dragId ?? e.dataTransfer.getData("text/plain");
    setDragId(null);
    setDragOver(null);
    if (!id) return;
    const current = optimisticTickets.find((t) => t.id === id);
    if (!current || current.status === status) return;
    startTransition(async () => {
      applyMove({ id, status });
      await moveTicket(id, status);
    });
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STATUS_ORDER.map((s) => (
        <div
          key={s}
          onDragOver={(e) => onDragOver(e, s)}
          onDragLeave={() => setDragOver((v) => (v === s ? null : v))}
          onDrop={(e) => onDrop(e, s)}
          className={`flex min-w-[260px] flex-1 flex-col rounded-lg p-3 transition ${
            dragOver === s ? "bg-slate-200 ring-2 ring-slate-400" : "bg-slate-100"
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <StatusBadge status={s} />
            <span className="text-xs font-medium text-slate-500">{byStatus[s].length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {byStatus[s].length === 0 ? (
              <p className="rounded border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
                Aucun ticket
              </p>
            ) : (
              byStatus[s].map((t) => {
                const deadline = formatDeadline(t.deadline);
                return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, t.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setDragOver(null);
                    }}
                    className={`group relative cursor-grab active:cursor-grabbing ${
                      dragId === t.id ? "opacity-40" : ""
                    }`}
                  >
                    <Link
                      href={`/tickets/${t.id}`}
                      draggable={false}
                      className="block rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2 pr-6">
                        <p className="text-sm font-medium leading-snug text-slate-900">
                          {slackToPlainText(t.title)}
                        </p>
                        <CategoryBadge category={t.category} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="truncate">{t.author_name ?? "—"}</span>
                        <div className="flex items-center gap-2">
                          {t.owner && <span className="capitalize">👤 {t.owner}</span>}
                          {deadline && <span>📅 {deadline}</span>}
                        </div>
                      </div>
                    </Link>
                    <DeleteTicketButton ticketId={t.id} ticketTitle={slackToPlainText(t.title)} />
                  </div>
                );
              })
            )}
          </div>
        </div>
      ))}

      <p className="sr-only" aria-live="polite">
        {STATUS_ORDER.map((s) => `${STATUS_LABEL[s]}: ${byStatus[s].length}`).join(" · ")}
      </p>
    </div>
  );
}
