-- TicketMafia initial schema
-- Run in Supabase SQL editor or via supabase CLI.
--
-- Auth model: a single shared app password gates the Next.js app.
-- Inside the app, identity is just 'gaspard' or 'arthur' (cookie-based).
-- All DB access goes through the Supabase service role from our Next.js
-- server, so we keep RLS disabled here for simplicity.

-- =========================================================
-- Tickets: one row per top-level Slack message
-- =========================================================
create type ticket_status   as enum ('todo', 'doing', 'waiting', 'done');
create type ticket_category as enum ('bugs', 'features');

create table public.tickets (
  id                 uuid primary key default gen_random_uuid(),
  slack_channel_id   text not null,
  slack_channel_name text,
  slack_ts           text not null,               -- message timestamp, unique within a channel
  category           ticket_category not null,
  title              text not null,               -- first line of the message, truncated
  body               text not null default '',
  slack_author_id    text,
  author_name        text,
  author_avatar      text,
  status             ticket_status not null default 'todo',
  owner              text,                        -- 'gaspard' | 'arthur' | null
  deadline           date,
  slack_permalink    text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (slack_channel_id, slack_ts)
);

create index tickets_status_idx    on public.tickets (status);
create index tickets_category_idx  on public.tickets (category);
create index tickets_owner_idx     on public.tickets (owner);
create index tickets_created_idx   on public.tickets (created_at desc);

-- =========================================================
-- Attachments: images/files attached to the Slack message
-- =========================================================
create table public.ticket_attachments (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid not null references public.tickets(id) on delete cascade,
  slack_file_id text,
  url           text not null,
  name          text,
  mimetype      text,
  created_at    timestamptz not null default now(),
  unique (ticket_id, slack_file_id)
);

create index attachments_ticket_idx on public.ticket_attachments (ticket_id);

-- =========================================================
-- Comments: Slack thread replies + in-app comments
-- =========================================================
create type comment_source as enum ('slack', 'app');

create table public.ticket_comments (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid not null references public.tickets(id) on delete cascade,
  source        comment_source not null,
  slack_ts      text,                           -- set when source = 'slack'
  slack_user_id text,
  author_name   text,                           -- Slack display name OR 'gaspard'/'arthur'
  author_avatar text,
  body          text not null,
  created_at    timestamptz not null default now(),
  unique (ticket_id, slack_ts)
);

create index comments_ticket_idx on public.ticket_comments (ticket_id, created_at);

-- =========================================================
-- Slack reactions: tracked so we can derive status cleanly
-- when reactions are removed
-- =========================================================
create table public.ticket_reactions (
  ticket_id     uuid not null references public.tickets(id) on delete cascade,
  slack_user_id text not null,
  emoji         text not null,                  -- e.g. 'white_check_mark', 'eyes'
  created_at    timestamptz not null default now(),
  primary key (ticket_id, slack_user_id, emoji)
);

create index reactions_ticket_idx on public.ticket_reactions (ticket_id);

-- =========================================================
-- updated_at auto-touch on tickets
-- =========================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tickets_touch_updated_at
  before update on public.tickets
  for each row execute procedure public.touch_updated_at();
