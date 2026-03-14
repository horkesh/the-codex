-- Saved Places — shared across all gents
create table public.locations (
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

-- All authenticated gents can see all saved places
create policy "locations_select"
  on public.locations for select
  to authenticated using (true);

-- Any gent can add a place
create policy "locations_insert"
  on public.locations for insert
  to authenticated with check (auth.uid() = created_by);

-- Any gent can edit any shared place (it's a communal list)
create policy "locations_update"
  on public.locations for update
  to authenticated using (true);

-- Any gent can delete any place
create policy "locations_delete"
  on public.locations for delete
  to authenticated using (true);
