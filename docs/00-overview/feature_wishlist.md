# Feature Wishlist — The Codex

Collected improvement ideas from post-launch review. Grouped by theme.

---

## Close Open Loops

### Convert Prospect → Entry
When a scouted event actually happens, a single button should promote it to a Chronicle entry with all data pre-filled (event name, venue, date, city, cover thumbnail). Sets `status = 'converted'` and `converted_entry_id` on the prospect. Currently users abandon the prospect and manually re-enter everything.

### Wishlist → Completed Link
A bucket list item has no connection to a Chronicle entry when it gets done. A "Mark as Done" action should let you pick an existing Chronicle entry to link it to, or create a new one. The `converted_entry_id` column already exists on `bucket_list`.

---

## Social / Interactive

### Prospect Voting
"Share with Gents" is a one-way broadcast — no response mechanism. Add a 👍 / 👎 (or "I'm in" / "Pass") vote per gent on a shared prospect. Three gents, three votes visible as a row of avatars with their stance. Creates genuine group decision-making.

**Schema**: `prospect_votes` table — `id, prospect_id, gent_id, vote ('in'|'pass'), created_at`. Unique on `(prospect_id, gent_id)`.

### Entry Comments
Reactions (legendary, classic, ruthless, noted) are too abstract for actual conversation. A short comment field on entries lets gents annotate memories, argue about the steak score, caption photos.

**Schema**: `entry_comments` table — `id, entry_id, gent_id, body text, created_at`. Max 280 chars. Displayed below reactions in EntryDetail. Realtime subscription so comments appear live.

---

## Profiles & Identity

### Trophy Case on Gent Profiles
Achievements and thresholds already exist in the DB — they're just not shown on `/gents/:alias`. Display them as a visual badge grid between the stats row and the bio. Reuses existing `fetchEarnedAchievements` / `fetchEarnedThresholds` data. Zero new infrastructure.

### Signature Stat
A single "most iconic" line derived from data, shown prominently on gent profiles under the portrait. Derived automatically: e.g. "32 steaks · Connoisseur" / "9 countries · Globetrotter". Picks the gent's highest relative stat.

---

## Gamification

### Streaks in Ledger
"8 consecutive months with a night out" — derivable from existing entry data. Show current streak + personal record for each gent's most common activity type. Visible in Ledger and on gent profiles. Very motivating to maintain.

### Monthly Crown
Whoever logs the most entries in the current calendar month gets a small crown (👑) shown on their avatar in the SectionNav or their profile. Resets on the 1st. Creates natural low-stakes competition.

---

## Polish & Feel

### Animated Reactions
When you tap a reaction, a small burst of the emoji/icon floats up from the button and fades out. ~20 lines of Framer Motion. Currently reactions feel like checkboxes — this makes them feel satisfying.

### Quick-Log FAB
The "New Entry" FAB only appears on the Chronicle page. A global quick-log button (or swipe up from nav bar) accessible from anywhere jumps straight to the entry type selector. Reduces friction for logging on the go.

### Push Notifications (PWA)
When a gent logs a new entry, shares a prospect, or comments on an entry — the other gents get a browser push notification. PWA infrastructure already exists. This is the single biggest jump from "app I check" to "app that calls me back."

**Requires**: Supabase `push_subscriptions` table, a `send-push` edge function, and VAPID keys in Supabase secrets.

---

## Priority Order (recommended)

1. Animated reactions — 30 min, pure polish
2. Trophy case on gent profiles — 1h, reuses existing data
3. Signature stat — 30 min, pure derivation
4. Entry comments — 2h, new table + realtime
5. Prospect voting — 2h, new table + UI
6. Convert prospect → entry — 2h, closes key workflow
7. Wishlist → completed link — 1h, existing column + UI
8. Streaks in Ledger — 2h, data derivation
9. Monthly crown — 1h, derivation + nav badge
10. Quick-log FAB — 1h, route + animation
11. Push notifications — 4h, infra-heavy
