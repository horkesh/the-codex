-- Saved Places — shared across all gents
create table if not exists public.locations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  type         text not null default 'other'
                 check (type in ('restaurant', 'bar', 'home', 'venue', 'other')),
  city         text not null,
  country      text not null,
  country_code text not null,
  lat          double precision,
  lng          double precision,
  address      text,
  created_by   uuid not null references public.gents(id) on delete cascade,
  created_at   timestamptz default now()
);

alter table public.locations enable row level security;

-- Idempotent RLS policies
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'locations' and policyname = 'locations_select'
  ) then
    execute 'create policy "locations_select" on public.locations for select to authenticated using (true)';
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'locations' and policyname = 'locations_insert'
  ) then
    execute 'create policy "locations_insert" on public.locations for insert to authenticated with check (auth.uid() = created_by)';
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'locations' and policyname = 'locations_update'
  ) then
    execute 'create policy "locations_update" on public.locations for update to authenticated using (true)';
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'locations' and policyname = 'locations_delete'
  ) then
    execute 'create policy "locations_delete" on public.locations for delete to authenticated using (true)';
  end if;
end $$;
