import Link from "next/link";
import { notFound } from "next/navigation";
import { getTicket, listOwners } from "@/lib/db/queries";
import { CategoryBadge, StatusBadge } from "@/components/badges";
import { CommentForm } from "@/components/CommentForm";
import { DeleteTicketButton } from "@/components/DeleteTicketButton";
import { PhotoGallery } from "@/components/PhotoGallery";
import { TicketEditor } from "@/components/TicketEditor";
import { TitleEditor } from "@/components/TitleEditor";
import { SlackText } from "@/lib/slack/mrkdwn";
import { slackToPlainText } from "@/lib/slack/text";
import { deleteComment } from "./actions";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ ticket, attachments, comments }, owners] = await Promise.all([
    getTicket(id),
    listOwners(),
  ]);
  if (!ticket) notFound();

  const isImage = (mime: string | null) => mime?.startsWith("image/") ?? false;
  const imageAttachments = attachments.filter((a) => isImage(a.mimetype));
  const fileAttachments = attachments.filter((a) => !isImage(a.mimetype));
  const slackComments = comments.filter((c) => c.source === "slack");
  const appComments = comments.filter((c) => c.source === "app");

  return (
    <main className="mx-auto max-w-7xl px-6 py-4">
      <div className="mb-4">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
          ← Tous les tickets
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* LEFT — contenu lisible */}
        <div className="flex min-w-0 flex-col gap-6">
          <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <CategoryBadge category={ticket.category} />
              <StatusBadge status={ticket.status} />
            </div>

            <TitleEditor ticketId={ticket.id} title={ticket.title} />

            {ticket.body && (
              <div className="mb-6 text-sm leading-relaxed text-slate-800">
                <SlackText text={ticket.body} />
              </div>
            )}

            {imageAttachments.length > 0 && (
              <div className="mb-6">
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Photos ({imageAttachments.length})
                </h2>
                <PhotoGallery
                  images={imageAttachments.map((att) => ({
                    id: att.id,
                    src: `/api/files/${att.id}`,
                    alt: att.name ?? "image",
                  }))}
                />
              </div>
            )}

            {fileAttachments.length > 0 && (
              <div>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Fichiers ({fileAttachments.length})
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {fileAttachments.map((att) => (
                    <a
                      key={att.id}
                      href={`/api/files/${att.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 hover:bg-slate-100"
                    >
                      📎 {att.name ?? "Fichier"}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </article>

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <span>💬</span> Conversation Slack
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-normal text-slate-500">
                {slackComments.length}
              </span>
            </h2>

            {slackComments.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
                Aucun reply dans le thread Slack.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {slackComments.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                      <span className="font-medium text-slate-700">{c.author_name ?? "—"}</span>
                      <span>{formatDateTime(c.created_at)}</span>
                    </div>
                    <div className="text-sm text-slate-800">
                      <SlackText text={c.body} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT — sidebar sticky */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-1">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Triage
            </h2>
            <TicketEditor
              ticketId={ticket.id}
              status={ticket.status}
              owner={ticket.owner}
              deadline={ticket.deadline}
              ownerOptions={owners.map((o) => o.name)}
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Infos
            </h2>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-400">Auteur</dt>
                <dd className="font-medium text-slate-700">{ticket.author_name ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-400">Créé le</dt>
                <dd className="font-medium text-slate-700">{formatDateTime(ticket.created_at)}</dd>
              </div>
            </dl>
            {ticket.slack_permalink && (
              <a
                href={ticket.slack_permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block text-xs text-slate-500 hover:text-slate-700"
              >
                Voir sur Slack ↗
              </a>
            )}
          </div>

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <span>📝</span> Notes internes
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-normal text-slate-500">
                {appComments.length}
              </span>
            </h2>

            <div className="mb-3 flex flex-col gap-2">
              {appComments.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
                  Aucune note pour l'instant.
                </p>
              ) : (
                appComments.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg border border-amber-200 bg-amber-50 p-3 shadow-sm"
                  >
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                      <span className="font-medium capitalize text-slate-700">
                        {c.author_name ?? "—"}
                      </span>
                      <div className="flex items-center gap-2">
                        <span>{formatDateTime(c.created_at)}</span>
                        <form action={deleteComment}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="ticket_id" value={ticket.id} />
                          <button
                            type="submit"
                            className="text-xs text-slate-400 hover:text-red-600"
                            aria-label="Supprimer"
                          >
                            ✕
                          </button>
                        </form>
                      </div>
                    </div>
                    <div className="text-sm text-slate-800">
                      <SlackText text={c.body} />
                    </div>
                  </div>
                ))
              )}
            </div>

            <CommentForm ticketId={ticket.id} />
          </section>

          <div className="flex justify-end">
            <DeleteTicketButton
              ticketId={ticket.id}
              ticketTitle={slackToPlainText(ticket.title)}
              variant="detail"
            />
          </div>
        </aside>
      </div>
    </main>
  );
}
