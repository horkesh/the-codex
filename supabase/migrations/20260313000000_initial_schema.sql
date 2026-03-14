-- The Codex — Initial Schema
-- Run: supabase db push

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- =====================
-- GENTS
-- =====================
create table public.gents (
  id            uuid primary key references auth.users(id) on delete cascade,
  alias         text not null check (alias in ('keys', 'bass', 'lorekeeper')),
  display_name  text not null,
  full_alias    text not null,
  avatar_url    text,
  bio           text,
  created_at    timestamptz default now()
);

alter table public.gents enable row level security;
create policy "gents_select" on public.gents for select to authenticated using (true);
create policy "gents_update" on public.gents for update to authenticated using (auth.uid() = id);

-- =====================
-- ENTRIES
-- =====================
create table public.entries (
  id                  uuid primary key default gen_random_uuid(),
  type                text not null check (type in ('mission','night_out','steak','playstation','toast','gathering','interlude')),
  title               text not null,
  date                date not null,
  location            text,
  city                text,
  country             text,
  country_code        text,
  description         text,
  lore                text,
  lore_generated_at   timestamptz,
  cover_image_url     text,
  status              text not null default 'draft' check (status in ('draft','published','gathering_pre','gathering_post')),
  metadata            jsonb not null default '{}',
  created_by          uuid not null references public.gents(id),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table public.entries enable row level security;
create policy "entries_select" on public.entries for select to authenticated using (true);
create policy "entries_insert" on public.entries for insert to authenticated with check (auth.uid() = created_by);
create policy "entries_update" on public.entries for update to authenticated using (true);
create policy "entries_delete" on public.entries for delete to authenticated using (auth.uid() = created_by);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger entries_updated_at before update on public.entries
  for each row execute function public.set_updated_at();

-- =====================
-- ENTRY PARTICIPANTS
-- =====================
create table public.entry_participants (
  entry_id  uuid not null references public.entries(id) on delete cascade,
  gent_id   uuid not null references public.gents(id),
  role      text,
  primary key (entry_id, gent_id)
);

alter table public.entry_participants enable row level security;
create policy "ep_select" on public.entry_participants for select to authenticated using (true);
create policy "ep_insert" on public.entry_participants for insert to authenticated with check (true);
create policy "ep_delete" on public.entry_participants for delete to authenticated using (true);

-- =====================
-- ENTRY PHOTOS
-- =====================
create table public.entry_photos (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references public.entries(id) on delete cascade,
  url         text not null,
  caption     text,
  taken_by    uuid references public.gents(id),
  sort_order  int not null default 0,
  created_at  timestamptz default now()
);

alter table public.entry_photos enable row level security;
create policy "photos_select" on public.entry_photos for select to authenticated using (true);
create policy "photos_insert" on public.entry_photos for insert to authenticated with check (true);
create policy "photos_delete" on public.entry_photos for delete to authenticated using (auth.uid() = taken_by);

-- =====================
-- PASSPORT STAMPS
-- =====================
create table public.passport_stamps (
  id            uuid primary key default gen_random_uuid(),
  entry_id      uuid references public.entries(id) on delete cascade,
  type          text not null check (type in ('mission','achievement','diplomatic')),
  name          text not null,
  city          text,
  country       text,
  country_code  text,
  image_url     text,
  description   text,
  date_earned   date not null,
  created_at    timestamptz default now()
);

alter table public.passport_stamps enable row level security;
create policy "stamps_select" on public.passport_stamps for select to authenticated using (true);
create policy "stamps_insert" on public.passport_stamps for insert to authenticated with check (true);

-- =====================
-- ACHIEVEMENTS
-- =====================
create table public.achievements (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null,
  icon        text,
  type        text not null check (type in ('milestone','streak','legendary')),
  criteria    jsonb not null default '{}',
  stamp_id    uuid references public.passport_stamps(id),
  earned_by   uuid references public.gents(id),
  earned_at   timestamptz,
  created_at  timestamptz default now()
);

alter table public.achievements enable row level security;
create policy "achievements_select" on public.achievements for select to authenticated using (true);
create policy "achievements_insert" on public.achievements for insert to authenticated with check (true);

-- =====================
-- PEOPLE (The Circle)
-- =====================
create table public.people (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  instagram     text,
  photo_url     text,
  met_at_entry  uuid references public.entries(id),
  met_date      date,
  met_location  text,
  notes         text,
  labels        text[] not null default '{}',
  added_by      uuid references public.gents(id),
  created_at    timestamptz default now()
);

alter table public.people enable row level security;
create policy "people_select" on public.people for select to authenticated using (true);
create policy "people_insert" on public.people for insert to authenticated with check (true);
create policy "people_update" on public.people for update to authenticated using (true);
create policy "people_delete" on public.people for delete to authenticated using (auth.uid() = added_by);

-- =====================
-- PEOPLE NOTES (private per-gent)
-- =====================
create table public.people_notes (
  id          uuid primary key default gen_random_uuid(),
  person_id   uuid not null references public.people(id) on delete cascade,
  gent_id     uuid not null references public.gents(id),
  note        text not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (person_id, gent_id)
);

alter table public.people_notes enable row level security;
-- Strict: only own notes visible
create policy "pnotes_select" on public.people_notes for select to authenticated using (auth.uid() = gent_id);
create policy "pnotes_insert" on public.people_notes for insert to authenticated with check (auth.uid() = gent_id);
create policy "pnotes_update" on public.people_notes for update to authenticated using (auth.uid() = gent_id);
create policy "pnotes_delete" on public.people_notes for delete to authenticated using (auth.uid() = gent_id);

create trigger people_notes_updated_at before update on public.people_notes
  for each row execute function public.set_updated_at();

-- =====================
-- GATHERING RSVPs (public insert)
-- =====================
create table public.gathering_rsvps (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references public.entries(id) on delete cascade,
  name        text not null,
  email       text,
  response    text not null check (response in ('attending','not_attending','maybe')),
  created_at  timestamptz default now()
);

alter table public.gathering_rsvps enable row level security;
create policy "rsvp_select" on public.gathering_rsvps for select to authenticated using (true);
create policy "rsvp_insert" on public.gathering_rsvps for insert to anon with check (true);
create policy "rsvp_delete" on public.gathering_rsvps for delete to authenticated using (true);

-- =====================
-- GUEST BOOK MESSAGES (public insert)
-- =====================
create table public.guest_book_messages (
  id              uuid primary key default gen_random_uuid(),
  entry_id        uuid not null references public.entries(id) on delete cascade,
  guest_name      text not null,
  cocktail_chosen text,
  message         text,
  created_at      timestamptz default now()
);

alter table public.guest_book_messages enable row level security;
create policy "gbm_select" on public.guest_book_messages for select to authenticated using (true);
create policy "gbm_insert" on public.guest_book_messages for insert to anon with check (true);
create policy "gbm_delete" on public.guest_book_messages for delete to authenticated using (true);

-- =====================
-- GENT STATS VIEW
-- =====================
create view public.gent_stats as
select
  g.id as gent_id,
  g.alias,
  count(distinct case when e.type = 'mission'      then e.id end)::int as missions,
  count(distinct case when e.type = 'night_out'    then e.id end)::int as nights_out,
  count(distinct case when e.type = 'steak'        then e.id end)::int as steaks,
  count(distinct case when e.type = 'playstation'  then e.id end)::int as ps5_sessions,
  count(distinct case when e.type = 'toast'        then e.id end)::int as toasts,
  count(distinct case when e.type = 'gathering'    then e.id end)::int as gatherings,
  count(distinct p.id)::int                                             as people_met,
  count(distinct ps.country)::int                                       as countries_visited,
  count(distinct ps.city)::int                                          as cities_visited,
  count(distinct ps.id)::int                                            as stamps_collected
from public.gents g
left join public.entry_participants ep on ep.gent_id = g.id
left join public.entries e on e.id = ep.entry_id and e.status = 'published'
left join public.passport_stamps ps on ps.entry_id = e.id and ps.type = 'mission'
left join public.people p on p.added_by = g.id
group by g.id, g.alias;
