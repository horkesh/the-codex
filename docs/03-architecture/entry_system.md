# Entry System — The Codex

The Chronicle is built on entries. Every experience the Gents have is an entry.

---

## Entry types

| Type | Display name | Badge | Description |
|---|---|---|---|
| `mission` | Mission | *Mission* | A trip. Multi-day or day trip. Creates passport stamps. |
| `night_out` | Night Out | *Night Out* | Going out — bars, clubs, restaurants, events |
| `steak` | The Table | *The Table* | Specifically a steak dinner. The Gents take their steaks seriously. |
| `playstation` | The Pitch | *The Pitch* | PlayStation session. Match-by-match tracking, head-to-head records. |
| `toast` | The Toast | *The Toast* | A cocktail party session (links to the existing Toast app) |
| `gathering` | Gathering | *Gathering* | A curated event — villa weekend, cocktail party, intimate gathering. Two-phase: pre-event (invite) and post-event (Chronicle entry). |
| `interlude` | Interlude | *Interlude* | Anything else worth logging |

---

## Entry states

- `draft` — saved but not published. Not visible in the main Chronicle. Not counted in stats.
- `published` — live. Visible, counted, stamps created (for missions).

**Gathering-specific states:**

- `gathering_pre` — pre-event phase. Gathering exists, invite card generated, RSVP link live. Shown in a dedicated "Upcoming" section, not the main Chronicle timeline.
- `gathering_post` — post-event phase. Photos added, Lore generated. Ready to publish.
- `published` — Gathering is fully complete and lives in the Chronicle as a permanent entry.

---

## Entry creation flow

### Standard flow (all types except Gathering)

1. Tap **+** (floating action button)
2. Select entry type (visual card selection — each type has distinct icon + colour)
3. Fill in type-specific form (see field spec per type below)
4. Select participants (which Gents were there — checkboxes)
5. Optional: upload photos
6. Tap **Publish**
7. App:
   - Creates entry in DB
   - Creates entry_participants rows
   - If `mission`: creates passport stamps for each city/country
   - Triggers Claude `generate-lore` Edge Function (async — Lore appears after a few seconds)
   - Triggers Gemini `generate-cover` if no user photo uploaded (async)
   - Checks achievement criteria → awards any new achievements

### Gathering flow (two-phase)

**Phase 1 — Pre-event:**
1. Tap **+** → select Gathering
2. Fill in: title, event date, location, guest list (select from The Circle + add new names)
3. Tap **Create Gathering** → entry created with state `gathering_pre`
4. App generates invite card (two outputs):
   - Downloadable image (1080×1350, luxury invite card, The Codex branding) → share via WhatsApp
   - Public RSVP web link (no login required) → guests land on animated invite page with RSVP button
5. Gathering appears in "Upcoming" section with countdown to event date
6. As guests RSVP via the web link, their responses populate the guest list in real-time

**Phase 2 — Post-event:**
1. Open the Gathering entry after the event
2. Tap **Add Post-Event Content**
3. Upload photos
4. Optionally: review QR guest book responses (names, cocktails chosen, messages left at the party)
5. Tap **Generate Lore** → Claude writes the Gathering narrative
6. Tap **Publish** → entry state moves to `published`, entry appears in Chronicle timeline
7. App checks achievement criteria

---

## Field spec per type

### Mission
- Title* (text) — "Budapest Protocol", "Return of the Gents"
- Date range* (date picker — start + end)
- Countries visited* (multi-select with flag emoji)
- Cities visited* (multi-text)
- Description (textarea) — free notes
- Total expense in KM (number)
- Highlights (multi-text) — key moments, used by Claude for Lore
- Photos (file upload, multiple)

### Night Out
- Title* (text) — auto-suggested: "[City] Night, [Date]"
- Date*
- Venue name (text)
- City*
- Vibe rating (1–5 stars)
- Special moment (textarea) — the moment of the night
- Photos

### The Table (steak)
- Title* — auto-suggested: "The [Restaurant] Steak"
- Date*
- Restaurant*
- City*
- Cut (text — Ribeye, T-bone, Wagyu, etc.)
- Doneness (select)
- Price in KM (number)
- Verdict (textarea) — the official judgment
- Orders per Gent (text per participant)
- Rating (1–5)
- Photos

### The Pitch (PlayStation)
- Title* — auto-suggested: "The [Date] Session"
- Date*
- Game* (text)
- Matches (repeatable match log — see below)
- Session winner (auto-calculated from matches, or override)
- Notes (textarea)

**Match logging** — every match in the session is logged individually:

| Field | Type | Notes |
|---|---|---|
| Player 1 | select | One of the three Gents |
| Player 2 | select | One of the three Gents |
| Score | text | e.g., `3-1`, `2-2` |
| Winner | auto / manual | Derived from score, or null for draws |

The entry detail view shows:
- All matches in order (scoreboard layout)
- Session winner (most wins in session)
- Head-to-head record per pairing (all-time across all PlayStation entries):
  - Keys vs Bass: W-D-L
  - Keys vs Lorekeeper: W-D-L
  - Bass vs Lorekeeper: W-D-L

### The Toast
- Title*
- Date*
- Session code (from The Toast app) — auto-populated if synced
- Guest count (number) — auto-populated if synced
- Theme (text) — auto-populated if synced
- Duration in minutes (number) — auto-populated if synced
- Notes

**Auto-sync:** When a Toast app session ends, it automatically creates a draft Toast entry in The Codex pre-populated with session code, guest count, theme, duration, and date. The Gent opens the draft, adds photos, and publishes.

### Gathering
**Pre-event fields:**
- Title* (text) — "Herzegovina Summer", "The Silk Road Party"
- Event date* (date picker)
- Location* (text + optional coordinates)
- Guest list (multi-select from The Circle + free-text for new names)
- Description / vibe (textarea) — used for invite card copy and Claude Lore

**Post-event fields (added in Phase 2):**
- Photos (file upload, multiple)
- Lore (Claude-generated after photos + description are in)
- QR guest book responses (read-only — populated via public QR page at the event)

### Interlude
- Title*
- Date*
- Description* (textarea)
- Photos

---

## The Lore

Every published entry gets a Lore — Claude's cinematic narrative of the experience.

- Generated asynchronously after entry creation (or after post-event phase for Gatherings)
- Displayed in the entry detail view with a distinct visual treatment (Playfair Display italic, slightly indented, gold left border)
- Cannot be manually edited (to preserve the Lorekeeper voice)
- Can be regenerated (button in entry settings) if the user wants a different take
- If generation fails, the entry is still valid — Lore shows a retry button

---

## The Invite Card (Gathering)

Two outputs generated when a Gathering is created:

### 1. Exported image
- Dimensions: 1080×1350 (portrait post format)
- Style: luxury event invite — cream/ivory background, black serif typography, gold rule lines, The Codex crest
- Content: event title, date, location, "You are cordially invited" copy, The Gents Chronicles branding
- Share intent: WhatsApp, downloaded to camera roll

### 2. Public RSVP web link
- Format: `thecodex.app/g/[gathering-slug]` (or Supabase function URL)
- No login required — accessible by anyone with the link
- Animated page: event details, countdown, RSVP button
- Guest enters name + email (optional) + attendance response
- RSVP responses appear in the Gathering entry in real-time (Supabase realtime subscription)

---

## QR Guest Book (live party)

At the event, a QR code is displayed (printed card, on-screen, etc.). Guests scan it with their phone:

- No login required
- No app install required
- Landing page: party title, a warm welcome message, simple form:
  - Name (text, required)
  - Cocktail from the party menu (select from list defined in the Gathering entry)
  - Message / guest book entry (textarea, optional)
- On submit: response saved to `guest_book_messages` table, linked to the Gathering entry
- Responses appear in the Gathering entry in real-time

The cocktail menu for the QR page is defined as part of the Gathering entry (added when creating/editing the Gathering pre-event).

---

## Cover image

Each entry has one cover image.

Priority:
1. User-uploaded photo (first photo, or user-designated cover)
2. Gemini-generated cover (requested after entry creation)
3. Type-specific default gradient (fallback if Gemini fails)

---

## Auto-stamp creation (missions)

When a mission entry is published:

```
For each city in metadata.cities:
  → Create passport_stamps row:
     type: 'mission'
     name: '[City] — [Mission Title]'
     city: city
     country: derived from mission metadata
     date_earned: mission start date
     entry_id: this entry

→ Trigger generate-stamp Edge Function for each stamp (queued, not parallel)
```

---

## Stats impact

Every published entry is counted immediately in the `gent_stats` view. No manual refresh needed — the SQL view computes on query.

Entry deletion reverses the stat. Draft entries are excluded from all stats. `gathering_pre` and `gathering_post` states are excluded — only `published` Gatherings count.
