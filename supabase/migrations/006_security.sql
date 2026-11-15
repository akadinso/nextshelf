-- Security activity log. Run after 005.
-- Customers can READ their own trail. Only the server (service role) can write, so a stolen
-- session cannot forge or erase entries.
create table if not exists security_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists security_events_user_idx on security_events (user_id, created_at desc);

alter table security_events enable row level security;

drop policy if exists "own security events read" on security_events;
create policy "own security events read" on security_events for select using (user_id = auth.uid());
-- Deliberately no insert / update / delete policies.
revoke insert, update, delete on security_events from anon, authenticated;

-- Data minimisation: keep about 6 months. With pg_cron enabled:
-- select cron.schedule('prune-security-events', '0 3 * * *',
--   $$ delete from security_events where created_at < now() - interval '180 days' $$);
