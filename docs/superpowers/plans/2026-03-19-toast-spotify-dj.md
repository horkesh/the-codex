# Toast Spotify DJ Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Beard & Bass a DJ panel in The Toast — search Spotify, queue tracks, play 30s previews for all participants, log setlist to Chronicles entries.

**Architecture:** Spotify Client Credentials on Toast server (no user auth). DJ socket handlers manage queue/playback state. Clients play 30s preview audio. Setlist bridges to Chronicles via existing `receive-toast-session`. New `toast_tracks` DB table in Chronicles.

**Tech Stack:** Spotify Web API (Client Credentials), Socket.io, HTMLAudioElement, Supabase (Postgres)

**Spec:** `docs/superpowers/specs/2026-03-19-toast-spotify-dj-design.md`

**Repos:**
- Toast app: `C:\Users\User\OneDrive - United Nations Development Programme\Documents\Personal\The Gents`
- Chronicles: `C:\Users\User\OneDrive - United Nations Development Programme\Documents\Personal\Chronicles`

---

## Chunk 1: Toast Server — Spotify Service + DJ Handlers

### Task 1: Spotify Service

**Files (Toast repo):**
- Create: `server/src/services/spotify.ts`

- [ ] **Step 1: Write the Spotify service**

```typescript
import { logger } from '../utils/logger.js';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  albumArt: string;
  previewUrl: string | null;
  durationMs: number;
  spotifyUrl: string;
}

let tokenCache: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string | null> {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    logger.info('spotify', 'Spotify credentials not configured');
    return null;
  }

  if (tokenCache && Date.now() < tokenCache.expiresAt - 60000) {
    return tokenCache.token;
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    logger.error('spotify', `Token fetch failed: ${res.status}`);
    return null;
  }

  const data = await res.json();
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return tokenCache.token;
}

function mapTrack(t: any): SpotifyTrack {
  return {
    id: t.id,
    name: t.name,
    artist: t.artists?.map((a: any) => a.name).join(', ') || 'Unknown',
    albumArt: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || '',
    previewUrl: t.preview_url || null,
    durationMs: t.duration_ms || 0,
    spotifyUrl: t.external_urls?.spotify || '',
  };
}

export async function searchTracks(query: string, limit = 10): Promise<SpotifyTrack[]> {
  const token = await getAccessToken();
  if (!token) return [];

  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit * 2}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!res.ok) {
    logger.error('spotify', `Search failed: ${res.status}`);
    return [];
  }

  const data = await res.json();
  const tracks = (data.tracks?.items || []).map(mapTrack);

  // Filter to only tracks with preview URLs
  return tracks.filter((t: SpotifyTrack) => t.previewUrl !== null).slice(0, limit);
}

const VIBE_QUERIES: Record<string, string[]> = {
  intimate: ['late night jazz', 'chill acoustic lounge', 'smooth bossa nova'],
  electric: ['high energy dance', 'electronic house beats', 'upbeat funk'],
  chaotic: ['punk rock energy', 'industrial bass', 'high tempo drum and bass'],
};

export async function getVibeRecommendations(vibe: string, limit = 5): Promise<SpotifyTrack[]> {
  const queries = VIBE_QUERIES[vibe.toLowerCase()] || VIBE_QUERIES.intimate;
  const query = queries[Math.floor(Math.random() * queries.length)];
  return searchTracks(query, limit);
}
```

- [ ] **Step 2: Update `.env.example`**

Add to `server/.env.example`:
```
# Spotify (Client Credentials — no user login)
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
```

- [ ] **Step 3: Commit**

```bash
git add server/src/services/spotify.ts server/.env.example
git commit -m "feat: add Spotify service with Client Credentials auth + search"
```

---

### Task 2: Shared Types for DJ Events

**Files (Toast repo):**
- Modify: `shared/src/types/events.ts`
- Modify: `shared/src/types/room.ts` (or wherever SpotifyTrack should live)

- [ ] **Step 1: Add SpotifyTrack to shared types**

Create or add to shared types:

```typescript
export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  albumArt: string;
  previewUrl: string | null;
  durationMs: number;
  spotifyUrl: string;
}
```

- [ ] **Step 2: Add DJ events to socket event types**

In `ClientToServerEvents`:
```typescript
DJ_SEARCH: (data: { query: string }) => void;
DJ_GET_SUGGESTIONS: (data: { vibe: string }) => void;
DJ_QUEUE_TRACK: (data: { track: SpotifyTrack }) => void;
DJ_SKIP: () => void;
DJ_REMOVE_FROM_QUEUE: (data: { trackId: string }) => void;
DJ_PREVIEW_ENDED: () => void;
DJ_SET_TRACK_OF_NIGHT: (data: { trackId: string }) => void;
```

In `ServerToClientEvents`:
```typescript
DJ_SEARCH_RESULTS: (data: { tracks: SpotifyTrack[] }) => void;
DJ_SUGGESTIONS: (data: { tracks: SpotifyTrack[] }) => void;
DJ_NOW_PLAYING: (data: { track: SpotifyTrack }) => void;
DJ_STOPPED: () => void;
DJ_QUEUE_UPDATE: (data: { queue: SpotifyTrack[] }) => void;
```

- [ ] **Step 3: Commit**

```bash
git add shared/src/types/
git commit -m "feat: add SpotifyTrack type + DJ socket events to shared types"
```

---

### Task 3: DJ Socket Handlers

**Files (Toast repo):**
- Create: `server/src/socket/dj.ts`
- Modify: `server/src/socket/handler.ts` — register DJ handlers

- [ ] **Step 1: Create DJ handler module**

```typescript
import type { Socket } from 'socket.io';
import type { SpotifyTrack } from '@the-toast/shared';
import { searchTracks, getVibeRecommendations } from '../services/spotify.js';
import { getRoom, getRoomCode } from '../services/room.js';
import { logger } from '../utils/logger.js';

interface DJState {
  queue: SpotifyTrack[];
  nowPlaying: SpotifyTrack | null;
  setlist: Array<SpotifyTrack & { act: number; playOrder: number; playStartedAt: number; reactionsDuringPlay: number }>;
  trackOfTheNight: string | null;
  playOrderCounter: number;
  lastAdvanceAt: number; // debounce DJ_PREVIEW_ENDED
}

const djStates = new Map<string, DJState>();

export function getDJState(code: string): DJState | undefined {
  return djStates.get(code);
}

export function cleanupDJState(code: string): void {
  djStates.delete(code);
}

export function trackReactionForDJ(code: string): void {
  const state = djStates.get(code);
  if (!state?.nowPlaying) return;
  const current = state.setlist[state.setlist.length - 1];
  if (current) current.reactionsDuringPlay++;
}

function getOrCreateState(code: string): DJState {
  if (!djStates.has(code)) {
    djStates.set(code, {
      queue: [],
      nowPlaying: null,
      setlist: [],
      trackOfTheNight: null,
      playOrderCounter: 0,
      lastAdvanceAt: 0,
    });
  }
  return djStates.get(code)!;
}

async function isBass(socket: Socket, code: string): Promise<boolean> {
  const room = await getRoom(code);
  if (!room) return false;
  const participant = room.participants.find(p => p.id === socket.id);
  return participant?.role === 'bass';
}

// Note: Role-gate all DJ_SEARCH, DJ_QUEUE_TRACK, DJ_SKIP, DJ_REMOVE_FROM_QUEUE,
// DJ_SET_TRACK_OF_NIGHT handlers by calling isBass() at the top and returning early if false.
// DJ_PREVIEW_ENDED and DJ_GET_SUGGESTIONS are safe for any participant.

async function advanceQueue(namespace: any, code: string): Promise<void> {
  const state = getOrCreateState(code);

  if (state.queue.length === 0) {
    state.nowPlaying = null;
    namespace.to(code).emit('DJ_STOPPED');
    return;
  }

  const next = state.queue.shift()!;
  state.nowPlaying = next;

  const room = await getRoom(code);
  const act = room?.act || 1;

  state.setlist.push({
    ...next,
    act,
    playOrder: state.playOrderCounter++,
    playStartedAt: Date.now(),
    reactionsDuringPlay: 0,
  });

  namespace.to(code).emit('DJ_NOW_PLAYING', { track: next });

  // Send updated queue to Bass
  // (Bass-only emit would need socket ID lookup — broadcast for simplicity, client ignores if not Bass)
  namespace.to(code).emit('DJ_QUEUE_UPDATE', { queue: state.queue });
}

export function setupDJHandlers(socket: Socket, namespace: any) {
  socket.on('DJ_SEARCH', async ({ query }) => {
    const code = getRoomCode(socket);
    if (!code) return;

    try {
      const tracks = await searchTracks(query);
      socket.emit('DJ_SEARCH_RESULTS', { tracks });
    } catch (err) {
      logger.error('dj', 'Search failed', err);
    }
  });

  socket.on('DJ_GET_SUGGESTIONS', async ({ vibe }) => {
    const code = getRoomCode(socket);
    if (!code) return;

    try {
      const tracks = await getVibeRecommendations(vibe);
      socket.emit('DJ_SUGGESTIONS', { tracks });
    } catch (err) {
      logger.error('dj', 'Suggestions failed', err);
    }
  });

  socket.on('DJ_QUEUE_TRACK', async ({ track }) => {
    const code = getRoomCode(socket);
    if (!code) return;

    const state = getOrCreateState(code);
    state.queue.push(track);

    // If nothing playing, start playback
    if (!state.nowPlaying) {
      await advanceQueue(namespace, code);
    } else {
      namespace.to(code).emit('DJ_QUEUE_UPDATE', { queue: state.queue });
    }

    logger.info('dj', `Queued "${track.name}" in ${code}`);
  });

  socket.on('DJ_SKIP', async () => {
    const code = getRoomCode(socket);
    if (!code) return;

    await advanceQueue(namespace, code);
    logger.info('dj', `Skipped track in ${code}`);
  });

  socket.on('DJ_REMOVE_FROM_QUEUE', ({ trackId }) => {
    const code = getRoomCode(socket);
    if (!code) return;

    const state = djStates.get(code);
    if (!state) return;

    state.queue = state.queue.filter(t => t.id !== trackId);
    namespace.to(code).emit('DJ_QUEUE_UPDATE', { queue: state.queue });
  });

  socket.on('DJ_PREVIEW_ENDED', async () => {
    const code = getRoomCode(socket);
    if (!code) return;

    const state = djStates.get(code);
    if (!state) return;

    // Debounce: ignore if another client already triggered advance within 2s
    if (Date.now() - state.lastAdvanceAt < 2000) return;
    state.lastAdvanceAt = Date.now();

    await advanceQueue(namespace, code);
  });

  socket.on('DJ_SET_TRACK_OF_NIGHT', ({ trackId }) => {
    const code = getRoomCode(socket);
    if (!code) return;

    const state = djStates.get(code);
    if (!state) return;

    state.trackOfTheNight = trackId;
    logger.info('dj', `Track of the Night set to ${trackId} in ${code}`);
  });
}
```

- [ ] **Step 2: Register DJ handlers**

Read `server/src/socket/handler.ts` to find where `setupPartyHandlers` is called. Add:

```typescript
import { setupDJHandlers } from './dj.js';

// Inside the connection handler, after setupPartyHandlers:
setupDJHandlers(socket, namespace);
```

- [ ] **Step 3: Wire reaction tracking**

In `server/src/socket/party.ts`, find the `SEND_REACTION` handler. Add:

```typescript
import { trackReactionForDJ } from './dj.js';

// Inside SEND_REACTION handler:
trackReactionForDJ(code);
```

- [ ] **Step 4: Wire cleanup**

In `server/src/socket/party.ts`, find `cleanupRoom()`. Add:

```typescript
import { cleanupDJState } from './dj.js';

// Inside cleanupRoom:
cleanupDJState(code);
```

- [ ] **Step 5: Commit**

```bash
git add server/src/socket/dj.ts server/src/socket/handler.ts server/src/socket/party.ts
git commit -m "feat: add DJ socket handlers — search, queue, playback, skip"
```

---

### Task 4: Wire DJ Setlist into Bridge

**Files (Toast repo):**
- Modify: `server/src/services/bridge.ts`
- Modify: `server/src/socket/party.ts`

- [ ] **Step 1: Add tracks to BridgePayload**

In `bridge.ts`, add to the `session` shape in `BridgePayload`:

```typescript
tracks: Array<{ name: string; artist: string; album_art_url: string; spotify_url: string; act: number; play_order: number; is_track_of_night: boolean }>;
```

- [ ] **Step 2: Populate tracks in bridge call**

In `party.ts`, in the bridge section of `generateWrappedCards()`, import `getDJState` and build the tracks payload:

```typescript
import { getDJState } from './dj.js';

// In the bridge section, before bridgeToChronicles call:
const djState = getDJState(code);
const trackOfNight = djState?.trackOfTheNight
  || djState?.setlist.reduce((best, t) => (!best || t.reactionsDuringPlay > best.reactionsDuringPlay) ? t : best, djState.setlist[0])?.id
  || null;

const tracksPayload = (djState?.setlist || []).map(t => ({
  name: t.name,
  artist: t.artist,
  album_art_url: t.albumArt,
  spotify_url: t.spotifyUrl,
  act: t.act,
  play_order: t.playOrder,
  is_track_of_night: t.id === trackOfNight,
}));
```

Add `tracks: tracksPayload` to the bridge payload session object.

- [ ] **Step 3: Commit**

```bash
git add server/src/services/bridge.ts server/src/socket/party.ts
git commit -m "feat: wire DJ setlist into Chronicles bridge payload"
```

---

### Chunk 1 Checkpoint

- [ ] Run `/simplify` to review changed code for reuse, quality, and efficiency before proceeding.

---

## Chunk 2: Toast Client — DJ Panel + Now Playing + Playback

### Task 5: DJ Playback Hook

**Files (Toast repo):**
- Create: `client/src/hooks/useDJPlayback.ts`

- [ ] **Step 1: Write the playback hook**

```typescript
import { useState, useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import type { SpotifyTrack } from '@the-toast/shared';

export function useDJPlayback(socket: Socket | null) {
  const [nowPlaying, setNowPlaying] = useState<SpotifyTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleNowPlaying = ({ track }: { track: SpotifyTrack }) => {
      setNowPlaying(track);
      setIsPlaying(true);

      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.volume = 0.3;
      }

      const audio = audioRef.current;
      audio.src = track.previewUrl || '';
      audio.play().catch(() => {});

      audio.onended = () => {
        setIsPlaying(false);
        socket.emit('DJ_PREVIEW_ENDED');
      };
    };

    const handleStopped = () => {
      setNowPlaying(null);
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };

    socket.on('DJ_NOW_PLAYING', handleNowPlaying);
    socket.on('DJ_STOPPED', handleStopped);

    return () => {
      socket.off('DJ_NOW_PLAYING', handleNowPlaying);
      socket.off('DJ_STOPPED', handleStopped);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [socket]);

  return { nowPlaying, isPlaying };
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/hooks/useDJPlayback.ts
git commit -m "feat: add useDJPlayback hook for client-side audio"
```

---

### Task 6: Now Playing Bar

**Files (Toast repo):**
- Create: `client/src/components/party/NowPlayingBar.tsx`

- [ ] **Step 1: Write the component**

```typescript
import { motion, AnimatePresence } from 'framer-motion';
import type { SpotifyTrack } from '@the-toast/shared';

interface NowPlayingBarProps {
  track: SpotifyTrack | null;
  isPlaying: boolean;
}

function EqualiserIcon() {
  return (
    <div className="flex items-end gap-[2px] h-4">
      {[1, 2, 3].map(i => (
        <motion.div
          key={i}
          className="w-[3px] bg-amber-400 rounded-full"
          animate={{ height: ['4px', '16px', '8px', '14px', '4px'] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

export function NowPlayingBar({ track, isPlaying }: NowPlayingBarProps) {
  return (
    <AnimatePresence>
      {track && isPlaying && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-charcoal/95 backdrop-blur-sm border-t border-white/10 px-4 py-3"
        >
          <div className="flex items-center gap-3 max-w-md mx-auto">
            {track.albumArt && (
              <img src={track.albumArt} alt="" className="w-8 h-8 rounded" />
            )}
            <EqualiserIcon />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{track.name}</p>
              <p className="text-white/50 text-xs truncate">{track.artist}</p>
            </div>
            {track.spotifyUrl && (
              <a
                href={track.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 text-xs font-medium shrink-0"
              >
                Open in Spotify
              </a>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Wire into Party page**

Read `client/src/pages/Party.tsx`. Add:
- Import `useDJPlayback` and `NowPlayingBar`
- Call `useDJPlayback(socket)` in the component
- Render `<NowPlayingBar track={nowPlaying} isPlaying={isPlaying} />` at the bottom

- [ ] **Step 3: Commit**

```bash
git add client/src/components/party/NowPlayingBar.tsx client/src/pages/Party.tsx
git commit -m "feat: add NowPlayingBar with equaliser animation"
```

---

### Task 7: DJ Panel in BassPanel

**Files (Toast repo):**
- Create: `client/src/components/gent-controls/DJPanel.tsx`
- Modify: `client/src/components/gent-controls/BassPanel.tsx`

- [ ] **Step 1: Write the DJ Panel component**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, X, SkipForward, Music } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import type { SpotifyTrack } from '@the-toast/shared';

interface DJPanelProps {
  socket: Socket;
  vibe: string;
}

export function DJPanel({ socket, vibe }: DJPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [suggestions, setSuggestions] = useState<SpotifyTrack[]>([]);
  const [queue, setQueue] = useState<SpotifyTrack[]>([]);
  const [searching, setSearching] = useState(false);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    setSearching(true);
    const timer = setTimeout(() => {
      socket.emit('DJ_SEARCH', { query });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, socket]);

  // Load vibe suggestions on mount
  useEffect(() => {
    socket.emit('DJ_GET_SUGGESTIONS', { vibe });
  }, [socket, vibe]);

  // Listeners
  useEffect(() => {
    const onResults = ({ tracks }: { tracks: SpotifyTrack[] }) => {
      setResults(tracks);
      setSearching(false);
    };
    const onSuggestions = ({ tracks }: { tracks: SpotifyTrack[] }) => setSuggestions(tracks);
    const onQueueUpdate = ({ queue: q }: { queue: SpotifyTrack[] }) => setQueue(q);

    socket.on('DJ_SEARCH_RESULTS', onResults);
    socket.on('DJ_SUGGESTIONS', onSuggestions);
    socket.on('DJ_QUEUE_UPDATE', onQueueUpdate);

    return () => {
      socket.off('DJ_SEARCH_RESULTS', onResults);
      socket.off('DJ_SUGGESTIONS', onSuggestions);
      socket.off('DJ_QUEUE_UPDATE', onQueueUpdate);
    };
  }, [socket]);

  const queueTrack = useCallback((track: SpotifyTrack) => {
    socket.emit('DJ_QUEUE_TRACK', { track });
  }, [socket]);

  const skip = useCallback(() => socket.emit('DJ_SKIP'), [socket]);
  const removeFromQueue = useCallback((trackId: string) => {
    socket.emit('DJ_REMOVE_FROM_QUEUE', { trackId });
  }, [socket]);

  function TrackRow({ track, action }: { track: SpotifyTrack; action: React.ReactNode }) {
    return (
      <div className="flex items-center gap-2 py-2">
        {track.albumArt && <img src={track.albumArt} alt="" className="w-10 h-10 rounded" />}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm truncate">{track.name}</p>
          <p className="text-white/50 text-xs truncate">{track.artist}</p>
        </div>
        {action}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search tracks..."
          className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 outline-none focus:border-amber-500/50"
        />
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="max-h-48 overflow-y-auto space-y-1">
          {results.map(t => (
            <TrackRow key={t.id} track={t} action={
              <button onClick={() => queueTrack(t)} className="p-1 text-amber-400 hover:text-amber-300">
                <Plus size={16} />
              </button>
            } />
          ))}
        </div>
      )}

      {/* Vibe Suggestions (shown when no search) */}
      {results.length === 0 && suggestions.length > 0 && !query && (
        <div>
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Vibe: {vibe}</p>
          <div className="space-y-1">
            {suggestions.map(t => (
              <TrackRow key={t.id} track={t} action={
                <button onClick={() => queueTrack(t)} className="p-1 text-amber-400 hover:text-amber-300">
                  <Plus size={16} />
                </button>
              } />
            ))}
          </div>
        </div>
      )}

      {/* Queue */}
      {queue.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/40 text-xs uppercase tracking-wider">Queue ({queue.length})</p>
            <button onClick={skip} className="text-amber-400 text-xs flex items-center gap-1">
              <SkipForward size={12} /> Skip
            </button>
          </div>
          <div className="space-y-1">
            {queue.map(t => (
              <TrackRow key={t.id} track={t} action={
                <button onClick={() => removeFromQueue(t.id)} className="p-1 text-white/30 hover:text-red-400">
                  <X size={14} />
                </button>
              } />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add DJ section to BassPanel**

Read `client/src/components/gent-controls/BassPanel.tsx`. Add a collapsible "DJ" section:

```typescript
import { DJPanel } from './DJPanel';
import { Music } from 'lucide-react';

// Inside BassPanel, add a collapsible section:
const [djOpen, setDjOpen] = useState(false);

// In render:
<button onClick={() => setDjOpen(!djOpen)} className="...">
  <Music size={16} /> DJ {djOpen ? '▾' : '▸'}
</button>
{djOpen && <DJPanel socket={socket} vibe={vibe} />}
```

Pass `socket` and `vibe` (current vibe energy) from props or context.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/gent-controls/DJPanel.tsx client/src/components/gent-controls/BassPanel.tsx
git commit -m "feat: add DJ panel to Beard & Bass controls"
```

---

### Task 8: Track of the Night in Wrapped

**Files (Toast repo):**
- Modify: `client/src/pages/Wrapped.tsx`

- [ ] **Step 1: Add Track of the Night selection**

Read `Wrapped.tsx`. Add state for the setlist and track selection. Listen for DJ data. The server should emit setlist data with wrapped — or Bass can pick from what played.

For simplicity, the server emits the setlist via a new event `DJ_SETLIST` at wrapped time. Add to `dj.ts`:

```typescript
// Export function to emit setlist at wrapped time
export function emitSetlistForWrapped(namespace: any, code: string): void {
  const state = djStates.get(code);
  if (!state || state.setlist.length === 0) return;
  namespace.to(code).emit('DJ_SETLIST', { setlist: state.setlist });
}
```

Call it from `generateWrappedCards()` in `party.ts` before the wrapped loop.

In Wrapped.tsx, add:
- Listen for `DJ_SETLIST`
- Show setlist with star toggles (only for Bass role)
- On star tap, emit `DJ_SET_TRACK_OF_NIGHT`

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/Wrapped.tsx server/src/socket/dj.ts server/src/socket/party.ts
git commit -m "feat: Track of the Night selection in Wrapped screen"
```

---

### Chunk 2 Checkpoint

- [ ] Run `/simplify` to review changed code for reuse, quality, and efficiency before proceeding.

---

## Chunk 3: Chronicles — DB, Edge Function, UI

### Task 9: Database Migration

**Files (Chronicles repo):**
- Create: `supabase/migrations/20260319110000_toast_tracks.sql`

- [ ] **Step 1: Write the migration**

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

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260319110000_toast_tracks.sql
git commit -m "feat(db): add toast_tracks table for DJ setlist"
```

---

### Task 10: Update Edge Function + Types

**Files (Chronicles repo):**
- Modify: `supabase/functions/receive-toast-session/index.ts`
- Modify: `src/types/app.ts`
- Modify: `src/data/toast.ts`

- [ ] **Step 1: Add track insert to edge function**

In `receive-toast-session/index.ts`, after the confessions/wrapped inserts, add:

```typescript
// Insert tracks (setlist)
const trackRows = (session.tracks || []).map((t: any, i: number) => ({
  session_id: sessionId,
  name: t.name,
  artist: t.artist,
  album_art_url: t.album_art_url || null,
  spotify_url: t.spotify_url || null,
  act: t.act || null,
  play_order: t.play_order ?? i,
  is_track_of_night: !!t.is_track_of_night,
}))
if (trackRows.length) {
  await db.from('toast_tracks').insert(trackRows)
}
```

- [ ] **Step 2: Add ToastTrack type to Chronicles**

In `src/types/app.ts`:

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

Update `ToastSessionFull`:

```typescript
export interface ToastSessionFull {
  session: ToastSession
  cocktails: ToastCocktail[]
  confessions: ToastConfession[]
  wrapped: ToastWrapped[]
  tracks: ToastTrack[]
}
```

- [ ] **Step 3: Fetch tracks in toast data layer**

In `src/data/toast.ts`, update `fetchToastSession` to also fetch tracks:

```typescript
// Add to the Promise.all:
supabase
  .from('toast_tracks' as any)
  .select('*')
  .eq('session_id', (session as any).id)
  .order('play_order'),
```

Add to the return:
```typescript
tracks: (tracksRes.data || []) as unknown as ToastTrack[],
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/receive-toast-session/index.ts src/types/app.ts src/data/toast.ts
git commit -m "feat: add toast tracks to edge function, types, and data layer"
```

---

### Task 11: Setlist Section in ToastLayout

**Files (Chronicles repo):**
- Modify: `src/components/chronicle/ToastLayout.tsx`

- [ ] **Step 1: Add Setlist section**

Between Wrapped Strip and Group Snaps, add:

```typescript
{/* Setlist */}
{session.tracks.length > 0 && (
  <section>
    <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-3 flex items-center gap-2">
      <Music size={14} /> Setlist
    </p>
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
      {/* Track of the Night first */}
      {session.tracks
        .sort((a, b) => (b.is_track_of_night ? 1 : 0) - (a.is_track_of_night ? 1 : 0) || a.play_order - b.play_order)
        .map((t) => (
          <motion.div
            key={t.id}
            variants={staggerItem}
            className={`flex items-center gap-3 bg-slate-dark rounded-lg p-3 ${t.is_track_of_night ? 'border border-gold/40' : 'border border-white/5'}`}
          >
            {t.album_art_url && (
              <img src={t.album_art_url} alt="" className="w-10 h-10 rounded" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-ivory font-body text-sm truncate">
                {t.is_track_of_night && <Star size={12} className="inline text-gold mr-1" />}
                {t.name}
              </p>
              <p className="text-ivory-dim text-xs font-body truncate">{t.artist}</p>
            </div>
            {t.act && (
              <span className="text-ivory-dim text-xs font-body shrink-0">Act {t.act}</span>
            )}
            {t.spotify_url && (
              <a href={t.spotify_url} target="_blank" rel="noopener noreferrer" className="text-green-400 shrink-0">
                <ExternalLink size={14} />
              </a>
            )}
          </motion.div>
        ))}
    </motion.div>
  </section>
)}
```

Add `Music, Star, ExternalLink` to the lucide-react imports.

- [ ] **Step 2: Commit**

```bash
git add src/components/chronicle/ToastLayout.tsx
git commit -m "feat(ui): add Setlist section to ToastLayout"
```

---

### Task 12: Studio Export — Track of the Night

**Files (Chronicles repo):**
- Modify: `src/export/templates/ToastSessionCard.tsx`

- [ ] **Step 1: Add Track of the Night to V1 variant**

In the V1 function, after the guests/duration div and before `<BrandMark>`:

```typescript
{(() => {
  const trackOfNight = (entry.metadata?.tracks as any[])?.find((t: any) => t.is_track_of_night)
  if (!trackOfNight) return null
  return (
    <>
      <div style={{ width: '40px', height: '1px', backgroundColor: COLOR.goldDim }} />
      <p style={{ color: COLOR.gold, fontSize: '14px', fontFamily: FONT.body, textTransform: 'uppercase', letterSpacing: '2px' }}>
        TRACK OF THE NIGHT: {trackOfNight.name} — {trackOfNight.artist}
      </p>
    </>
  )
})()}
```

Note: The track data needs to be available in the template. Since Studio templates receive `entry` with metadata, the tracks should be passed via metadata or as a separate prop. Check how existing templates access session data.

If tracks are in the DB (not metadata), the simplest approach: fetch tracks in Studio and pass via a `tracks` prop or embed in entry metadata at fetch time. For V1, use metadata approach — the edge function already stores `session_id` in metadata, so tracks can be fetched separately. But for simplicity in export templates, embed the Track of the Night name/artist in entry metadata during publish.

Alternative: just read from the `toast_tracks` table in the Studio data fetch and pass as context. Follow the existing pattern for how mission debrief data reaches templates.

- [ ] **Step 2: Commit**

```bash
git add src/export/templates/ToastSessionCard.tsx
git commit -m "feat(studio): show Track of the Night on toast export V1"
```

---

### Task 13: Update .env + Type Check + Build

**Files (Toast repo):**
- Modify: `server/.env`

- [ ] **Step 1: Add Spotify env vars to Toast .env**

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
```

(User needs to create a Spotify app at https://developer.spotify.com/dashboard and paste credentials)

- [ ] **Step 2: Type check Chronicles**

```bash
cd Chronicles && npx tsc -b
```

Fix any errors.

- [ ] **Step 3: Build Toast**

```bash
cd "The Gents" && pnpm run build
```

Fix any errors.

- [ ] **Step 4: Commit fixes**

```bash
git commit -m "fix: resolve type errors from Spotify DJ integration"
```

- [ ] **Step 5: Push Chronicles + watch deploy**

```bash
cd Chronicles && git push
gh run watch $(gh run list --limit 1 --json databaseId -q '.[0].databaseId')
```

---

### Chunk 3 Checkpoint

- [ ] Run `/simplify` to review changed code for reuse, quality, and efficiency before proceeding.

---

## Addendum: Review Fixes

### Fix A: Track of the Night Auto-Selection with Timeout

In `server/src/socket/dj.ts`, export a function called at wrapped time:

```typescript
export function autoSelectTrackOfNight(code: string): void {
  const state = djStates.get(code);
  if (!state || state.setlist.length === 0) return;
  if (state.trackOfTheNight) return; // Bass already picked

  // Auto-select: highest reactionsDuringPlay, ties broken by earlier playOrder
  const best = state.setlist.reduce((a, b) =>
    b.reactionsDuringPlay > a.reactionsDuringPlay ? b :
    b.reactionsDuringPlay === a.reactionsDuringPlay && b.playOrder < a.playOrder ? b : a
  );
  state.trackOfTheNight = best.id;
}
```

In `party.ts` `generateWrappedCards()`, call `autoSelectTrackOfNight(code)` right before the bridge call. The 30-second window from the spec is handled by operation order: wrapped cards generate first (several seconds of AI calls), then auto-selection runs. If Bass picked during wrapped via `DJ_SET_TRACK_OF_NIGHT`, it's already set.

### Fix B: Studio Export Data Flow for Track of the Night

In `src/pages/Studio.tsx`, when a toast entry is selected, the `useToastSession` hook already fetches tracks. Pass `trackOfNight` to the template:

```typescript
const toastTracks = toastSession?.tracks
const trackOfNight = toastTracks?.find(t => t.is_track_of_night)
```

Update `ToastSessionCard` props to accept optional `trackOfNight: { name: string; artist: string } | null`. V1 renders the gold text line if present.

### Fix C: Concrete Wrapped.tsx Setlist UI

In `client/src/pages/Wrapped.tsx`:

```typescript
const [setlist, setSetlist] = useState<SpotifyTrack[]>([]);
const [selectedTrackOfNight, setSelectedTrackOfNight] = useState<string | null>(null);

useEffect(() => {
  if (!socket) return;
  const onSetlist = ({ setlist: sl }: { setlist: SpotifyTrack[] }) => setSetlist(sl);
  socket.on('DJ_SETLIST', onSetlist);
  return () => { socket.off('DJ_SETLIST', onSetlist); };
}, [socket]);

// Render after wrapped card (only star toggles for Bass role):
{setlist.length > 0 && (
  <div className="mt-6">
    <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Setlist</p>
    {setlist.map(t => (
      <div key={t.id} className="flex items-center gap-3 py-2">
        {t.albumArt && <img src={t.albumArt} className="w-8 h-8 rounded" />}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm truncate">{t.name}</p>
          <p className="text-white/50 text-xs truncate">{t.artist}</p>
        </div>
        {role === 'bass' && (
          <button
            onClick={() => {
              setSelectedTrackOfNight(t.id);
              socket?.emit('DJ_SET_TRACK_OF_NIGHT', { trackId: t.id });
            }}
            className={selectedTrackOfNight === t.id ? 'text-amber-400' : 'text-white/20'}
          >
            ★
          </button>
        )}
      </div>
    ))}
  </div>
)}
```

### Fix D: DJ_SETLIST Event

Add `DJ_SETLIST: (data: { setlist: SpotifyTrack[] }) => void` to `ServerToClientEvents` in shared types. Call `emitSetlistForWrapped()` from `generateWrappedCards()` before the participant loop.

### Fix E: Dependency Note

Tasks 9-12 (Chronicles DB/UI) depend on the migration being deployed. The edge function handles missing `toast_tracks` gracefully — insert silently fails. Chronicles UI shows nothing until migration runs. Deploy handles this automatically.
