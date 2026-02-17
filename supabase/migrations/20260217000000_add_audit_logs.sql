create table audit_logs (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users(id) on delete set null,
  event_type  text        not null check (event_type in (
                            'login','logout','page_view','heartbeat',
                            'create','update','delete')),
  entity_type text,   -- 'activity' | 'task' | 'deliverable' | etc.
  entity_id   text,   -- uuid of affected entity
  page        text,   -- route path for page_view events
  created_at  timestamptz not null default now()
);

create index audit_logs_user_id_idx    on audit_logs(user_id);
create index audit_logs_created_at_idx on audit_logs(created_at desc);
create index audit_logs_event_type_idx on audit_logs(event_type);

alter table audit_logs enable row level security;

-- any authenticated user can INSERT their own rows
create policy "Users can insert own audit logs"
  on audit_logs for insert to authenticated
  with check (user_id = auth.uid());

-- admins can SELECT all rows
create policy "Admins can read all audit logs"
  on audit_logs for select to authenticated
  using (
    exists (
      select 1 from team_members
      where id = auth.uid() and permission_level = 'admin'
    )
  );
