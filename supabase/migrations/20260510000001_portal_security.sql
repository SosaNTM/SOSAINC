-- Portal-level password protection
create table if not exists portal_security (
  portal_id   uuid primary key references portals(id) on delete cascade,
  is_enabled  boolean not null default false,
  password_hash text,  -- SHA-256 hex of the password (client-side hashed)
  updated_at  timestamptz not null default now()
);

alter table portal_security enable row level security;

-- Portal members can read (to check if lock is active)
create policy "portal_security_select" on portal_security
  for select using (
    exists (
      select 1 from portal_members
      where portal_members.portal_id = portal_security.portal_id
        and portal_members.user_id   = auth.uid()
    )
  );

-- Only owners/admins can write
create policy "portal_security_write" on portal_security
  for all using (
    exists (
      select 1 from portal_members
      where portal_members.portal_id = portal_security.portal_id
        and portal_members.user_id   = auth.uid()
        and portal_members.role      in ('owner', 'admin')
    )
  );
