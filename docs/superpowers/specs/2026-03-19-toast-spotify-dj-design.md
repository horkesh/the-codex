# Toast Spotify DJ Integration Design

**Date:** 2026-03-19
**Status:** Approved

## Overview

Beard & Bass gets a DJ panel in The Toast app. He searches and queues Spotify tracks during the session. All participants hear 30-second previews in-browser + get a "Listen on Spotify" link for full tracks. The setlist logs to Chronicles with a "Track of the Night" highlight.

## Spotify API: Client Credentials (No OAuth)

No user login required. Server uses Client Credentials flow (app-level `SPOTIFY_CLIENT_ID` + `SPOTIFY_CLIENT_SECRET`). Provides:
- Track search
- 30-second preview URLs (`preview_url`)
- Album art, artist, duration
- Audio features (energy, valence, danceability) for vibe-based recommendations
- Recommendations endpoint with audio feature targets

Token auto-refreshes (1-hour expiry). All Spotify calls are server-side only — clients never talk to Spotify directly.

**Env vars (Toast server `.env`):**
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`

## Beard & Bass DJ Panel

New collapsible "DJ" section in `BassPanel` (gent control panel for Beard & Bass role).

### Search
- Text input with debounced search (300ms)
- Results: compact cards — album art (40px), track name, artist, duration
- Tap to queue

### Vibe Suggestions
When DJ panel opens, server returns 5 track suggestions based on current vibe mode:

| Vibe | Audio Feature Targets |
|------|----------------------|
| Intimate | low energy (0.1–0.4), high valence (0.5–0.8), acoustic > 0.5 |
| Electric | high energy (0.7–1.0), high danceability (0.7–1.0) |
| Chaotic | high energy (0.8–1.0), low valence (0.0–0.3), loudness > -5dB |

**Fallback strategy:** Spotify's `/recommendations` endpoint is deprecated for new apps (Nov 2024). Use `/search` with vibe-themed queries instead:
- Intimate → search `genre:jazz chill acoustic` or curated query `"late night jazz"`
- Electric → search `genre:electronic dance house` or `"high energy dance"`
- Chaotic → search `genre:punk industrial` or `"high energy chaos"`

Filter results server-side to only include tracks where `preview_url !== null`. If `/recommendations` is available (older app credentials), use it as primary with search as fallback.

### Queue
- One track plays at a time (30s preview)
- When clip ends, next in queue auto-plays
- If queue is empty, playback stops
- Beard & Bass can skip current track
- Beard & Bass can reorder/remove from queue (drag or X button)

### Playback Control
Beard & Bass only — other participants have no play/pause/skip controls. He decides when music starts, what plays, and when to skip.

## Now Playing Bar

Persistent bar at the bottom of all participants' screens (above any existing UI chrome). Only visible when a track is playing.

- Album art (32px), track name, artist (truncated), "Listen on Spotify" link
- Subtle animated equalizer icon to indicate playback
- Fades in/out with track start/stop

## Preview Playback

Server emits `DJ_NOW_PLAYING` with `previewUrl`. Every client creates an `HTMLAudioElement` and plays the 30s clip. When the clip ends:
1. Client emits `DJ_PREVIEW_ENDED` to server
2. Server advances queue, emits next `DJ_NOW_PLAYING` (or `DJ_STOPPED` if queue empty)

Volume: fixed at 0.3 (background music level, doesn't overpower conversation).

## Track of the Night

At session end (wrapped screen), Beard & Bass sees the full setlist with a star toggle on each track. He taps one to mark it as Track of the Night. If he doesn't pick within 30 seconds, the track that was playing during the most reactions is auto-selected.

## Data Model

### SpotifyTrack (in-memory, shared type)

```typescript
interface SpotifyTrack {
  id: string           // Spotify track ID
  name: string
  artist: string
  albumArt: string     // URL to album art (300px)
  previewUrl: string | null  // 30s preview MP3 URL (null for some tracks)
  durationMs: number
  spotifyUrl: string   // External Spotify link
}
```

**Preview URL handling:** Many Spotify tracks return `preview_url: null` (especially with Client Credentials flow). Strategy:
- Search results are filtered server-side: only tracks with `preview_url !== null` are returned to the client
- If a queued track's preview becomes unavailable at play time, skip to next and show "Preview unavailable" briefly
- Vibe suggestions also filtered to preview-available tracks only
```

### DJState (server in-memory, per room)

```typescript
interface DJState {
  queue: SpotifyTrack[]
  nowPlaying: SpotifyTrack | null
  setlist: Array<SpotifyTrack & { act: number; playOrder: number }>
  trackOfTheNight: string | null  // track ID
}
```

Stored in `Map<roomCode, DJState>`. Cleaned up in `cleanupRoom()`.

### toast_tracks (new DB table in Chronicles)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `session_id` | uuid FK → toast_sessions (CASCADE) | |
| `name` | text NOT NULL | |
| `artist` | text NOT NULL | |
| `album_art_url` | text | |
| `spotify_url` | text | |
| `act` | integer | Which act the track played during |
| `play_order` | integer | Playback sequence |
| `is_track_of_night` | boolean DEFAULT false | |

RLS: SELECT for authenticated (same as other toast tables).

## Socket Events

| Direction | Event | Payload | Who |
|---|---|---|---|
| C→S | `DJ_SEARCH` | `{ query: string }` | Bass only |
| S→C | `DJ_SEARCH_RESULTS` | `{ tracks: SpotifyTrack[] }` | Bass only |
| C→S | `DJ_GET_SUGGESTIONS` | `{ vibe: string }` | Bass only |
| S→C | `DJ_SUGGESTIONS` | `{ tracks: SpotifyTrack[] }` | Bass only |
| C→S | `DJ_QUEUE_TRACK` | `{ track: SpotifyTrack }` | Bass only |
| C→S | `DJ_SKIP` | `{}` | Bass only |
| C→S | `DJ_REMOVE_FROM_QUEUE` | `{ trackId: string }` | Bass only |
| S→C | `DJ_NOW_PLAYING` | `{ track: SpotifyTrack }` | All |
| S→C | `DJ_STOPPED` | `{}` | All |
| S→C | `DJ_QUEUE_UPDATE` | `{ queue: SpotifyTrack[] }` | Bass only |
| C→S | `DJ_PREVIEW_ENDED` | `{}` | All (first to report triggers next) |
| C→S | `DJ_SET_TRACK_OF_NIGHT` | `{ trackId: string }` | Bass only |

## Server-Side Spotify Service

**File:** `server/src/services/spotify.ts`

```typescript
getAccessToken(): Promise<string>        // Auto-refresh Client Credentials token
searchTracks(query: string, limit?: number): Promise<SpotifyTrack[]>
getVibeRecommendations(vibe: string, limit?: number): Promise<SpotifyTrack[]>
```

Token caching: store `{ token, expiresAt }` in module scope. Refresh when `Date.now() > expiresAt - 60000` (1-min buffer).

## DJ Socket Handlers

**File:** `server/src/socket/dj.ts` (new file, registered alongside party handlers)

- Role-gated: search/queue/skip events rejected if sender is not `bass` role
- `DJ_PREVIEW_ENDED`: uses a debounce — first client to report triggers queue advance, subsequent reports within 2s are ignored (avoids double-advance with multiple clients)
- Queue advance: pop from queue, set as `nowPlaying`, add to `setlist`, emit `DJ_NOW_PLAYING`

## Chronicles Bridge Integration

### Payload addition

The existing `bridgeToChronicles()` payload gets a new `tracks` field:

```typescript
tracks: djState.setlist.map(t => ({
  name: t.name,
  artist: t.artist,
  album_art_url: t.albumArt,
  spotify_url: t.spotifyUrl,
  act: t.act,
  play_order: t.playOrder,
  is_track_of_night: t.id === djState.trackOfTheNight,
}))
```

### Edge function update

`receive-toast-session` inserts into `toast_tracks` after creating the session:

```typescript
const trackRows = (tracks || []).map((t, i) => ({
  session_id: sessionId,
  name: t.name,
  artist: t.artist,
  album_art_url: t.album_art_url || null,
  spotify_url: t.spotify_url || null,
  act: t.act || 1,
  play_order: t.play_order ?? i,
  is_track_of_night: !!t.is_track_of_night,
}))
if (trackRows.length) {
  await db.from('toast_tracks').insert(trackRows)
}
```

## Chronicles UI: Setlist Section in ToastLayout

New section in `ToastLayout` between Wrapped Strip and Group Snaps:

### Setlist display
- Section header: "Setlist" with a music note icon
- Track of the Night shown first with gold border + star icon
- Remaining tracks in play order — compact rows: album art (40px), name, artist, act pill
- Each row has a "Listen on Spotify" external link icon

### Data fetching
`fetchToastSession()` updated to also fetch `toast_tracks`:

```typescript
const tracksRes = await supabase
  .from('toast_tracks')
  .select('*')
  .eq('session_id', session.id)
  .order('play_order')
```

Added to `ToastSessionFull` type:
```typescript
tracks: ToastTrack[]
```

## Studio Export

The `toast_session_v1` (Classic) variant shows a subtle line at the bottom when Track of the Night exists:

```
TRACK OF THE NIGHT: Song Name — Artist
```

Gold text, small font (14px), uppercase tracking, above the BrandMark. No emojis (Chronicles design system). Use a thin gold rule as separator.

## Edge Function Config

`toast_tracks` table uses same RLS pattern as other toast tables (SELECT for authenticated). No new edge functions needed — `receive-toast-session` handles the insert.

**Migration:** `supabase/migrations/20260319110000_toast_tracks.sql`

```sql
CREATE TABLE IF NOT EXISTS toast_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES toast_sessions(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  artist text NOT NULL,
  album_art_url text,
  spotify_url text,
  act integer,
  play_order integer NOT NULL DEFAULT 0,
  is_track_of_night boolean NOT NULL DEFAULT false
);

ALTER TABLE toast_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read toast_tracks"
  ON toast_tracks FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_toast_tracks_session ON toast_tracks(session_id);
```

## Client Audio Management

**File:** `client/src/hooks/useDJPlayback.ts`

```typescript
function useDJPlayback(socket) {
  // Creates HTMLAudioElement on DJ_NOW_PLAYING
  // Sets volume to 0.3
  // On audio 'ended' event, emits DJ_PREVIEW_ENDED
  // On DJ_STOPPED, pauses and clears
  // Returns { nowPlaying, isPlaying }
}
```

Single audio element reused across tracks (prevents overlapping playback). Cleanup on unmount.

## Chronicles Types

**`ToastTrack` interface in `src/types/app.ts`:**
```typescript
export interface ToastTrack {
  id: string
  session_id: string
  name: string
  artist: string
  album_art_url: string | null
  spotify_url: string | null
  act: number | null
  play_order: number
  is_track_of_night: boolean
}
```

Added to `ToastSessionFull`:
```typescript
export interface ToastSessionFull {
  session: ToastSession
  cocktails: ToastCocktail[]
  confessions: ToastConfession[]
  wrapped: ToastWrapped[]
  tracks: ToastTrack[]
}
```

## Toast-Side Type Updates

Update `BridgePayload` in `server/src/services/bridge.ts` to include `tracks` field in the session shape.

Update shared events in `shared/src/types/events.ts` with all DJ socket events.

## Edge Cases

### Bass disconnects mid-session
DJ panel only renders when local participant role is `bass`. If Bass disconnects, `DJState` remains on server — music stops naturally when current preview ends and no one advances the queue. If Bass reconnects, they see the queue state restored.

### No Bass in session
`DJState` is only initialized when the first `DJ_*` event is received. If no Bass participant exists, no DJ state is created, no music plays, no setlist logged to Chronicles.

### Act tracking for setlist
`dj.ts` reads the current act from `RoomState` (via `getRoom(code)`) when a track starts playing. The act number is stored on the setlist entry at play time.

### Track of the Night auto-selection
Server tracks `playStartedAt` timestamp on each setlist entry. When reactions (`SEND_REACTION`) fire, server increments a `reactionsDuringPlay` counter on the currently-playing track. At wrapped time, if Bass hasn't set Track of the Night, the track with the highest `reactionsDuringPlay` wins. Ties broken by play order (earlier track wins).
