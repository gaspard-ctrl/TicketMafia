-- Two unrelated additions packaged together:
--
-- 1. Photos / files attached to a Slack thread reply now get linked to the
--    comment they came with (comment_id on ticket_attachments). NULL means
--    the attachment belongs to the top-level ticket message (existing rows).
--
-- 2. Track which tickets have an AI-generated title so the batch
--    "regenerate all" action can skip work when needed and so we can show
--    a small marker in the UI later if useful.

alter table public.ticket_attachments
  add column if not exists comment_id uuid
  references public.ticket_comments(id) on delete cascade;

create index if not exists attachments_comment_idx
  on public.ticket_attachments (comment_id);

alter table public.tickets
  add column if not exists title_ai_generated_at timestamptz;
