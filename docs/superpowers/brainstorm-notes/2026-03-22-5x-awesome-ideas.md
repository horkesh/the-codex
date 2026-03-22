# 5x More Awesome — Feature Ideas

**Date**: 2026-03-22
**Status**: Brainstorm — awaiting prioritisation

---

## 1. "On This Day" Time Machine

**What**: Daily nostalgia feature. Every morning, surface what happened 1, 2, 3 years ago.

**How it works**:
- Push notification at ~9am: "2 years ago: The Budapest Summit." with cover photo thumbnail
- Home page card showing "On This Day" with photo, lore excerpt, and "Revisit" link
- Multiple entries on the same date across years shown as a stack
- If nothing happened on this date, skip (or show nearest entry within 3 days)

**Technical**:
- Query: `entries WHERE date_part('month', date) = current AND date_part('day', date) = current AND date < this_year`
- Push: GitHub Actions cron at 7:00 UTC → edge function that queries + sends push per gent
- Home card: client-side query on mount, cached for the day

**Why it's powerful**: Creates daily engagement without creating content. The app reaches out to you.

---

## 2. AI Narrator Voice

**What**: A "Listen" button on every entry that reads the lore aloud in a cinematic narrator voice.

**How it works**:
- Button appears on EntryDetail when lore exists
- Tap → generates audio via TTS API (ElevenLabs or OpenAI TTS)
- Audio plays inline with a waveform visualiser
- Generated audio cached in Supabase Storage (re-use on replay)
- Voice: deep, warm, slightly wry male narrator — documentary style

**Technical**:
- Edge function: `generate-narration` — accepts lore text, calls TTS API, uploads MP3 to Storage
- Client: `useNarration(entryId)` hook — checks for cached audio, generates on demand
- Player: inline audio element with custom gold waveform UI
- Cost: ~$0.015/1000 chars (OpenAI TTS) or ~$0.18/1000 chars (ElevenLabs)
- Average lore is ~500 chars → $0.008–$0.09 per entry

**Why it's powerful**: Transforms lore from text to experience. Playing it in the car, at dinner, sharing with someone — it becomes a podcast of your life.

---

## 3. The Vault — Time Capsules

**What**: Seal a message + photos for a future date. No one can peek. Dramatic unsealing when the date arrives.

**How it works**:
- "Create Vault" button on Home or Chronicle
- Write a message, attach photos, pick an unlock date (6mo, 1yr, 2yr, 5yr, custom)
- Sealed with a dramatic animation (wax seal stamp, lock turning)
- Vault appears in a dedicated "Vaults" section — locked entries with countdown
- On unlock date: push notification "A vault has opened." + dramatic unsealing animation
- AI writes a reflection comparing the sealed moment to now (what's changed, who's still here)

**Technical**:
- DB: `vaults` table (id, created_by, message, photos, sealed_at, opens_at, opened, metadata)
- RLS: creator can see their own vaults but message/photos hidden until `opens_at <= now()`
- Cron: daily check for vaults where `opens_at <= today AND NOT opened` → push notification + mark opened
- AI reflection: edge function that reads the vault content + recent entries and writes a comparison

**Why it's powerful**: Emotional depth. The anticipation of waiting, the surprise of opening. "We wrote this before the Milan trip and now look where we are."

---

## 4. Interactive Timeline

**What**: A gorgeous horizontal scrollable timeline of the entire chronicle.

**How it works**:
- Golden thread connecting entries chronologically
- Each node: cover photo circle + title + entry type icon
- Zoom levels: Year view (dots) → Month view (thumbnails) → Day view (full cards)
- Pinch to zoom on mobile, scroll wheel on desktop
- Filter by: entry type, gent, city, country
- Tap a node to open the entry
- Missions span multiple nodes (start → end) with a gold arc

**Technical**:
- Canvas-based or SVG with virtual scrolling (only render visible nodes)
- `fetchEntries` already returns all needed data
- Could use a library like `@nivo/timeline` or custom SVG
- Photo thumbnails lazy-loaded as nodes scroll into view
- Route: `/chronicle/timeline`

**Why it's powerful**: The visual story of your friendship. Scroll back through years and see the golden thread of shared experiences.

---

## 5. Gent Rivalry Broadcast

**What**: PS5 sessions get a sports-broadcast treatment with animated stats.

**How it works**:
- **ELO ratings**: each gent has a dynamic rating that changes with wins/losses
- **Win probability**: before each session, show "Keys has a 62% chance against Bass"
- **Head-to-head dashboard**: visual bracket with records, streaks, dominance charts
- **AI trash talk**: after each session, AI generates a one-liner roast for the loser
- **Breaking news ticker**: "BREAKING: Beard & Bass has won 5 consecutive matches"
- **Season records**: quarterly/annual stats with "champion" crown

**Technical**:
- ELO calculation: simple formula from match results (already stored)
- Trash talk: Claude Haiku one-shot generation from match result
- Dashboard: new page `/ledger/rivalry` with animated charts (Framer Motion)
- Ticker: component on Home page when a streak is active

**Why it's powerful**: Turns gaming sessions into a spectacle. The trash talk alone would be worth it.

---

## 6. Annual Film

**What**: Auto-generated year-in-review video from entries.

**How it works**:
- Select a year → AI curates the best 15-20 photos across all entries
- Each photo gets Ken Burns treatment (slow pan/zoom)
- Lore excerpts appear as text overlays between photos
- Entry-type transitions (steak sizzle sound, cocktail clink, plane takeoff)
- Background music (user picks a mood: cinematic, jazz, electronic)
- 60-90 second MP4 export
- Share to Instagram Reels / Stories

**Technical**:
- Video generation: either client-side via Canvas API + MediaRecorder, or server-side via FFmpeg
- Client-side is feasible: capture canvas frames → encode to WebM/MP4
- Photo selection: AI picks highest quality_score photos or user curates
- Text overlay: lore oneliners rendered on canvas frames
- Music: royalty-free tracks bundled in app or user uploads

**Why it's powerful**: A movie of your year together. The kind of thing you'd watch at a New Year's dinner and get emotional about.

---

## 7. Memory Mixtape

**What**: Spotify-linked playlists from entries.

**How it works**:
- Entries with `metadata.song` already exist (Night Out live_music, Toast tracks)
- "Build Mixtape" button on Ledger or a dedicated page
- Select scope: per mission, per year, per gent, all time
- AI generates playlist name + description from lore excerpts
- Creates a Spotify playlist via API (or generates a shareable link with track list)
- Liner notes: each track paired with the lore excerpt from that entry
- Visual: album-art grid with entry dates

**Technical**:
- Spotify Web API: create playlist, add tracks (requires OAuth — Spotify Connect)
- Fallback if no Spotify: generate a shareable page with track list + Apple Music / YouTube links
- Track data already stored in `toast_tracks` (name, artist, album art, spotify_url)
- For non-Toast entries: `metadata.song` field exists
- Liner notes: pair track with `lore_oneliner` from the entry

**Why it's powerful**: Music is memory. A playlist that maps to your chronicle — play a song and remember the night.

---

## Priority Recommendation

| Priority | Feature | Impact | Effort |
|----------|---------|--------|--------|
| 1 | On This Day | Daily engagement, emotional | Low |
| 2 | The Vault | Emotional depth, anticipation | Medium |
| 3 | AI Narrator Voice | Wow factor, shareable | Medium |
| 4 | Interactive Timeline | Visual storytelling | High |
| 5 | Rivalry Broadcast | Fun, competitive energy | Medium |
| 6 | Memory Mixtape | Nostalgia, shareable | Medium |
| 7 | Annual Film | Cinematic, shareable | High |
