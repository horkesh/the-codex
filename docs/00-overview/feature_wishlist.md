# Feature Wishlist — The Codex

Collected improvement ideas from post-launch review. **All items completed** as of 2026-03-23.

---

## Close Open Loops

### ~~Convert Prospect → Entry~~ ✅
"Log as Entry" button in prospect card menu → navigates to EntryNew with pre-filled data (event name, venue, date, city). Sets `status = 'converted'` and `converted_entry_id` on the prospect.

### ~~Wishlist → Completed Link~~ ✅
"Mark as Done" on BucketList items opens modal to optionally link a Chronicle entry. `converted_entry_id` column stores the link. Done items show linked entry as a gold chip.

---

## Social / Interactive

### ~~Prospect Voting~~ ✅
`VoteStrip` component on shared prospects. `prospect_votes` table with `vote: 'in' | 'pass'`. Three gents, three avatar chips with green (in) / red (pass) rings. Tap to vote, tap again to remove.

### ~~Entry Comments~~ ✅
`CommentsSection` below reactions in EntryDetail. `entry_comments` table, 280 char max, real-time Supabase subscription, author avatars, delete by author. Push notification on new comments.

---

## Profiles & Identity

### ~~Trophy Case on Gent Profiles~~ ✅
Honours section on `/gents/:alias` with earned achievements + threshold badges. `fetchEarnedAchievements` + `fetchEarnedThresholds` called in parallel.

### ~~Signature Stat~~ ✅
Threshold-based labels (Connoisseur, Globetrotter, etc.) shown on gent profiles. Derived from stats.

---

## Gamification

### ~~Streaks in Ledger~~ ✅
`StreaksSection` in Ledger — consecutive month streaks per activity type per gent. Current streak + personal record.

### ~~Monthly Crown~~ ✅
Crown indicator in StatGrid for the gent with most entries in the current month.

---

## Polish & Feel

### ~~Animated Reactions~~ ✅
Burst particle animation on reaction tap — symbol floats up 32px, scales 1→1.6x, fades out over 500ms. Framer Motion `AnimatePresence`.

### ~~Quick-Log FAB~~ ✅
Global floating action button in `BottomNav` — accessible from any page, navigates to entry type selector.

### ~~Push Notifications~~ ✅
`sw-push.js` service worker (zero fetch interception). `push_subscriptions` table, `send-push` edge function, VAPID keys. Notifications on new entries, comments, RSVPs. Toggle on Profile page.
