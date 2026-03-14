# Screen Inventory — The Codex

## Routes

| Route | Component | Description |
|---|---|---|
| `/` | `Landing.tsx` | Login screen |
| `/chronicle` | `Chronicle.tsx` | Main feed — all entries, filterable |
| `/chronicle/new` | `EntryNew.tsx` | Log a new entry (type select → form) |
| `/chronicle/:id` | `EntryDetail.tsx` | Single entry — lore, photos, participants |
| `/chronicle/:id/edit` | `EntryEdit.tsx` | Edit entry |
| `/gathering/new` | `GatheringNew.tsx` | Create a new Gathering (pre-event) |
| `/gathering/:id` | `GatheringDetail.tsx` | Gathering detail — pre-event or post-event view depending on phase |
| `/gathering/:id/post-event` | `GatheringPostEvent.tsx` | Add post-event content (photos, finalize, publish) |
| `/passport` | `Passport.tsx` | Passport cover → stamp collection |
| `/passport/mission/:stampId` | `PassportMission.tsx` | Full mission passport page |
| `/circle` | `Circle.tsx` | People the Gents have met |
| `/circle/:id` | `PersonDetail.tsx` | Individual person card |
| `/studio` | `Studio.tsx` | Export center |
| `/ledger` | `Ledger.tsx` | Stats, achievements, Annual Wrapped |
| `/profile` | `Profile.tsx` | Gent profile + settings |

### Public routes (no authentication required)

| Route | Component | Description |
|---|---|---|
| `/g/:slug` | `PublicInvite.tsx` | Public Gathering invite page — RSVP, no login |
| `/g/:slug/guestbook` | `PublicGuestBook.tsx` | Live party QR guest book page — no login |

---

## Screen details

### Landing (`/`)
Purpose: Auth gate. The first thing a new session sees.

Content:
- Full-screen dark background with grain
- The Gents Chronicles wordmark (Playfair Display, gold)
- Tagline: *"The record of a brotherhood"*
- Email + password form
- No sign-up link (invite-only)

Behaviour: Authenticated users are redirected immediately to `/chronicle`.

---

### Chronicle (`/chronicle`)
Purpose: The main timeline. All entries, most recent first.

Layout (mobile):
- Fixed header: "THE CHRONICLE" + filter chips + `+` button
- **Upcoming Gatherings strip** (if any Gatherings are in `gathering_pre` state) — horizontal scroll, each shows title + countdown
- Scrollable feed of entry cards
- Bottom navigation bar (5 tabs: Chronicle, Passport, Circle, Studio, Ledger)

Entry card (compact):
- Entry type badge (coloured)
- Title (Playfair Display)
- Date + location (Instrument Sans, muted)
- Cover image (thumbnail, right side)
- Gent avatars who participated
- First line of Lore (italic, truncated)

Filters:
- All / Mission / Night Out / The Table / The Pitch / The Toast / Gathering / Interlude
- Filter by Gent (show only entries where Vedo/Delija/[user] participated)
- Date range (month picker)

FAB: Gold `+` button → type selection modal

---

### Entry New (`/chronicle/new`)
Purpose: Log a new experience.

Step 1: Type selection
- 7 cards, one per entry type (including Gathering)
- Each card: large icon, type name, colour accent
- Tap Gathering → routes to `/gathering/new` instead of the standard form
- Tap other types → proceed to form

Step 2: Form (type-specific)
- All required fields up top
- Optional fields collapsible
- Participant selector (checkboxes for the 3 Gents — pre-selected: current user)
- Photo upload (drag & drop or tap, multiple)
- Preview of cover image if uploaded

Step 3: Review
- Summary of what will be created (entry + stamps if mission)
- `Publish` and `Save as Draft` buttons

---

### Gathering New (`/gathering/new`)
Purpose: Create the pre-event phase of a Gathering.

Layout (mobile-first):
- Header: "NEW GATHERING"
- Form fields:
  - Title* (text input)
  - Event date* (date picker — shows countdown preview e.g. "In 14 days")
  - Location* (text input)
  - Guest list (multi-select from The Circle + free-text for new names not in The Circle)
  - Cocktail menu (repeatable text field — list of cocktails for the QR guest book)
  - Description / vibe (textarea — copy for invite card and Claude Lore later)
- Tap **Create Gathering** → entry created with status `gathering_pre`
- Transition: animated "invite card reveal" — the generated invite card slides up and unfolds
- Two action buttons:
  - **Download Invite Image** → exports the Invite Card PNG
  - **Copy RSVP Link** → copies the public web link to clipboard
- QR code displayed immediately — downloadable/printable for the party

---

### Gathering Detail (`/gathering/:id`)
Purpose: View and manage a Gathering across both phases.

**Pre-event view** (status = `gathering_pre`):
- Hero: Gathering title, date countdown ("14 days to Herzegovina Summer"), location
- Invite card thumbnail (tap → full preview)
- Share actions: Download Image, Copy RSVP Link, Download QR Code
- Guest list — shows names + RSVP status (confirmed / pending / not attending)
  - Real-time updates as RSVPs come in
- Action: **Mark as Past Event** → prompts to move to post-event phase

**Post-event view** (status = `gathering_post`):
- All pre-event info visible (read-only)
- Photo upload section
- Guest book messages panel (all messages from QR guest book, scrollable)
- **Generate Lore** button → calls Claude Edge Function
- Lore preview once generated
- **Publish Gathering** button → moves to `published`, entry appears in Chronicle

---

### Gathering Post-Event (`/gathering/:id/post-event`)
Purpose: Dedicated screen for completing a Gathering after the event.

Content:
- Photo upload (multiple, drag & drop / tap)
- Guest book messages review (read-only, scrollable list — name, cocktail, message)
- Lore section (generate + preview)
- Confirm and publish

---

### Entry Detail (`/chronicle/:id`)
Purpose: Full view of one entry.

Layout:
- Hero cover image (full-width, ~40vh)
- Entry type badge + title (overlay on image, bottom of hero)
- Date + location + participants (row below hero)
- `THE LORE` section: Claude-generated narrative (Playfair Display italic, gold left border)
  - While generating: subtle shimmer skeleton
  - After load: fade in
- Photos grid (2–3 column masonry)
- Metadata card (type-specific details — steak cut, PS5 match log, mission expense, gathering guest count)
- **PlayStation entries**: full match-by-match scoreboard + head-to-head records per pairing
- **Gathering entries**: guest list + guest book messages (after publish)
- Passport stamps created (for missions — shows stamp thumbnails)
- Edit button (top right, if current user is creator)

---

### Passport (`/passport`)
Purpose: The showpiece. Stamp collection.

Landing: Passport cover page
- Dark navy/green leather texture
- Gold embossed title: `THE GENTS CHRONICLES PASSPORT`
- Gent's alias below
- Gold crest
- Tap → opens to stamp pages

Main view (tabs):
- **Stamps** — grid of all mission stamps, most recent first
- **Achievements** — earned achievements as crests, locked ones greyed
- **Diplomatic** — special diplomatic stamps

Stamp card (grid item):
- Circular stamp image (Gemini-generated)
- City name below
- Date (small, Mono)

Tap stamp → expands to full detail:
- Large stamp image (with gold shimmer)
- Full stamp name
- Mission it belongs to
- Link to Entry Detail

---

### Passport Mission (`/passport/mission/:stampId`)
Purpose: The full visa/passport page for a mission. Designed to be shown to others.

Content:
- Passport page styling (guilloche borders, cream background within the dark app)
- Mission title
- Country stamps in a row
- Date range
- Lore excerpt (2 sentences)
- Photo strip (3–4 photos from the mission)
- Entry stats (duration, cities, participants)
- Studio export button (top right) — exports this page as an Instagram story

---

### Circle (`/circle`)
Purpose: People the Gents have met.

Layout:
- Search bar (by name or Instagram handle)
- Filter: All / by meeting location / by who added them / by label
- Grid of person cards (avatar + name + where met + label chips)

Person card:
- Photo (avatar style)
- Name
- Where & when met (small, muted)
- Instagram handle (tap → opens Instagram app)
- Which Gent added them
- Label chips (e.g., "legend", "BACHATA")

FAB: `+` → add person form

---

### Person Detail (`/circle/:id`)
Purpose: Full profile of one person from The Circle.

Content:
- Photo (large)
- Name + Instagram
- When and where met
- Linked entry (the night out / mission where they were met — links to entry)
- Labels (chips — editable by any Gent)
- Shared notes (visible to all Gents)
- **My Private Notes** (visible only to the current Gent — other Gents see nothing in this section)
  - Editable text area
  - Saves automatically on blur
  - No indicator to other Gents that private notes exist
- Who added them

---

### Studio (`/studio`)
Purpose: Export center for Instagram content.

Layout:
- Section: "From your Chronicle" — list of recent published entries
- Section: "Special" — Calling Cards (per Gent), Annual Wrapped

Entry selection:
- Tap an entry → shows available templates for that type
- Template grid: thumbnail preview, format label (Post / Story / Carousel)
- Tap template → generates export → download/share prompt

Special section:
- Three Calling Cards (one per Gent) — always available
- Annual Wrapped — available from January (shows previous year)

Gathering exports (available from Gathering Detail screen, not Studio):
- Countdown Card (available while `gathering_pre`)
- Invite Card image (available while `gathering_pre`)
- Gathering Recap Carousel (available after `published`)

Export UX:
- Tap "Export" → loading spinner (1–3 seconds for html-to-image render)
- Success: file downloads automatically, toast notification
- On mobile: Web Share API sheet if available

---

### Ledger (`/ledger`)
Purpose: Lifetime stats and Annual Wrapped.

Sections:
- **All-time stats** (the big numbers):
  - Missions, Countries, Cities, Nights Out, Steaks, PS5 Sessions, Gatherings Hosted, People Met, Stamps
  - Per-Gent breakdown (who leads what — tasteful, not competitive)
- **This year** (current calendar year):
  - Same stats but for current year only
- **Mission timeline** — horizontal scrollable list of all missions with stamps
- **Annual Wrapped** section:
  - Trigger "Generate Wrapped" button (calls Claude Edge Function)
  - Shows generated Wrapped text
  - Export button → go to Studio with Wrapped template pre-selected

---

### Profile (`/profile`)
Purpose: Current Gent's profile + app settings.

Sections:
- Avatar + display name + alias
- Calling Card preview (tap → Studio export)
- Bio (editable)
- App settings:
  - Notification preferences (when another Gent logs an entry)
  - Export quality (1x / 2x)

No theme toggle — dark only.

---

### Public Invite Page (`/g/:slug`) — NO AUTH REQUIRED
Purpose: Public-facing Gathering invite page. Accessible by anyone with the link. No login, no app install.

Content:
- Animated reveal: event title fades in, gold rule lines draw
- Event details: title, date, location, host ("The Gents")
- Countdown timer (live, updates every second)
- RSVP form:
  - Name* (text input)
  - Email (text input, optional)
  - Attendance (radio: "I'll be there" / "Can't make it" / "Maybe")
  - Submit button
- Confirmation message on submit: "See you there." / "You'll be missed."
- The Gents Chronicles wordmark (bottom)

Behaviour:
- RSVP submission calls a public Supabase Edge Function (no auth token needed)
- Edge Function inserts into `gathering_rsvps` table
- The Gathering entry in the app updates in real-time (Supabase realtime subscription)
- If the event date has passed, show a "This event has passed" message instead of the RSVP form

Design: Matches the Invite Card aesthetic — ivory/cream background, luxury feel, animated, mobile-first.

---

### Public QR Guest Book (`/g/:slug/guestbook`) — NO AUTH REQUIRED
Purpose: Live party guest book. Guests scan a QR code at the event. No login, no app install.

Content:
- Welcome message: party title + "Welcome. Leave your mark."
- Simple form:
  - Name* (text input)
  - Cocktail (select — populated from the party's cocktail menu, defined in the Gathering entry)
  - Message (textarea, optional — "Say anything")
  - Submit button
- On submit: animated confirmation — a small card flips with their name on it. "You're in the book."
- After submit: option to submit another (for different guests sharing one phone)

Behaviour:
- Submission calls a public Supabase Edge Function (no auth token needed)
- Edge Function inserts into `guest_book_messages` table
- The Gathering entry in the app updates in real-time

Design: Dark, intimate, party-appropriate. The one screen in The Codex that leans dark on purpose. Gold accents. Feels like signing a luxury guest book.
