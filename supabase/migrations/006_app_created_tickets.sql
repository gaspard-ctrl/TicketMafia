-- Allow tickets that were created from inside the app (no Slack origin).
-- For Slack-sourced tickets these columns stay populated as before; for
-- app-created tickets they're left NULL. The unique constraint on
-- (slack_channel_id, slack_ts) still works because Postgres treats NULLs
-- as distinct, so multiple app tickets can coexist with NULL/NULL.

alter table public.tickets alter column slack_channel_id drop not null;
alter table public.tickets alter column slack_ts drop not null;
