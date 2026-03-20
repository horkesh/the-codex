# Codebase Audit Report — 20 March 2026

Full audit across data layer, UI/state, and security/auth. 57 findings total.

---

## P0 — Critical (8)

| # | Area | File | Issue |
|---|---|---|---|
| 1 | Security | `config.toml` | `submit-guestbook`, `submit-rsvp`, `send-weekly-digest` missing from config.toml — 401 in production |
| 2 | Security | `PublicGuestBook.tsx:44` | Anon RLS blocks entries select for non-pinned gatherings — guestbook page broken |
| 3 | Data | `entries.ts:286` | `uploadEntryPhoto` ignores `entry_photos` DB insert error — phantom photos in storage |
| 4 | Data | `analyze-mission-photos:77` | `btoa(String.fromCharCode(...bigArray))` stack overflow on photos >500KB |
| 5 | Data | `receive-toast-session:126` | `c.people.name` crashes if Supabase returns array join |
| 6 | UI | `useWhereabouts.ts:37-43` | Interval not cleared on unmount — geolocation keeps running |
| 7 | UI | `useWhereabouts.ts:69-98` | `stopSharing` stale ref in interval + auto-stop dep array |
| 8 | Security | `.env.local` | Verify not committed to git history — contains live Supabase anon key |

## P1 — Significant (22)

| # | Area | File | Issue |
|---|---|---|---|
| 9 | Security | `initial_schema.sql:50` | `entries_update` RLS allows any gent to update any entry |
| 10 | Security | `new_features.sql:128` | `stories_update` RLS — same issue |
| 11 | Security | `person_gents.sql:21` | Any gent can delete any person_gents relationship |
| 12 | Security | `push_subscriptions.sql:14` | Push subscription keys visible to all users |
| 13 | Security | `weekly-digest.yml:14` | Called with anon key, function not in config.toml |
| 14 | Security | `receive-toast-session:37` | Returns HTTP 200 on auth failure |
| 15 | Data | `receive-toast-session:359` | Read-then-write race on toast_gent_stats counters |
| 16 | Data | `stats.ts:72` | Year stats counts draft entries (no status filter) |
| 17 | Data | `achievements.ts:91` | ps5_100 checks sessions not matches |
| 18 | Data | `missionIntel.ts:50` | Null session sends `Bearer undefined` |
| 19 | Data | `stamps.ts:58` | `createMissionStamp` throws on duplicate (ignoreDuplicates + .single()) |
| 20 | Data | `send-weekly-digest:67` | Today's gatherings excluded by string date comparison |
| 21 | Data | `analyze-instagram:37` | No timeout on user-supplied URL fetch |
| 22 | Data | `gatherings.ts:5` | fetchGatherings returns drafts |
| 23 | Data | `entries.ts:56` | gentId filter without currentGentId leaks private entries |
| 24 | UI | `Prospects.tsx:635` | Non-memoized load + empty dep; misses gent hydration |
| 25 | UI | `WhereaboutsWidget.tsx:137` | Displays raw UUID instead of gent name |
| 26 | UI | `useEntry.ts:23` | No error handling — infinite spinner on failure |
| 27 | UI | `useComments.ts:26` | State update after unmount in realtime handler |
| 28 | UI | `SceneEditor.tsx:27` | No try/catch — regenerating stuck on error |
| 29 | UI | `LoreSection.tsx:72` | Debounce fires stale entry.id on fast navigation |
| 30 | UI | `MissionDossier.tsx:64` | IntersectionObserver misses late-mounted refs |

## P2 — Minor / Edge Cases (27)

| # | Area | File | Issue |
|---|---|---|---|
| 31 | Security | All edge functions | Wildcard CORS — unauthenticated AI functions can be abused |
| 32 | Security | `auth.ts:21` | Gent profile in localStorage with no sign-out clearing |
| 33 | Security | `PublicInvite.tsx:37` | Same broken RLS as guestbook |
| 34 | Security | `new_features.sql:165` | Any gent can update any wishlist item |
| 35 | Security | `initial_schema.sql:74` | ep_insert/pa_insert no ownership check |
| 36 | Security | `new_features.sql:101` | prospects_insert no created_by enforcement |
| 37 | Security | `config.toml:169` | enable_signup = true (should be false for invite-only) |
| 38 | Security | `deploy.yml` | No pre-deploy type check, no rollback on migration failure |
| 39 | Data | `entries.ts:357` | renumberVolumes swallows update errors |
| 40 | Data | `photos.ts:17` | Nested join filter may be unreliable |
| 41 | Data | `prospects.ts:6` | fetchProspects silently mutates DB |
| 42 | Data | `gatherings.ts:33` | updateGatheringMetadata read-then-write race |
| 43 | Data | `generate-stamp:70` | No timeout on Claude API |
| 44 | Data | `generate-template-bg:181` | AbortController timer never cleared |
| 45 | Data | `toast.ts:23` | fetchToastSession swallows query errors |
| 46 | Data | `entryComments.ts:31` | fetchCommentById swallows all errors |
| 47 | Data | `analyze-instagram:100` | Wrong model (sonnet instead of haiku) for screenshot |
| 48 | Data | `generate-scene:85` | Raw REST upload instead of SDK |
| 49 | Data | `people.ts:274` | select('*') bypassing column allowlist |
| 50 | Data | `receive-toast-session:230` | Cocktail images orphaned in storage |
| 51 | UI | `Profile.tsx:98` | No-op setInterval — dead code |
| 52 | UI | `Modal.tsx:55` | Weak aria-label instead of aria-labelledby |
| 53 | UI | `EntryCard.tsx:37` | Clickable div not keyboard-accessible |
| 54 | UI | `DayStickyNav.tsx` | scrollIntoView blocked by sticky on iOS |
| 55 | UI | `GentPerspectives.tsx:58` | Missing type="button" |
| 56 | UI | `SearchBar.tsx:21` | Debounce timer not cleared on unmount |
| 57 | UI | `MissionDossier.tsx:113` | Drop-cap breaks on quote-starting paragraphs |
