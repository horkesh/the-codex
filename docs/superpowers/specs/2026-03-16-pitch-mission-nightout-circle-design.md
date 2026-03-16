# Pitch/Mission/Night Out/Circle Enhancements — Design Spec

## Goal
Bring feature parity across entry types (EXIF date, photo limits, lore coverage) and add mission date ranges + circle multi-gent relationships.

## 1. Pitch EXIF Date
- Add `detectedLocation?: LocationFill` prop to `PlaystationForm`
- Add `useEffect` to auto-fill `date` from `detectedLocation.date` (same pattern as SteakForm)
- Wire in `EntryNew.tsx` — pass `locationFill` to PlaystationForm

## 2. Mission Date Range
- **DB migration**: `ALTER TABLE entries ADD COLUMN date_end text;`
- **MissionForm**: add optional "End Date" input below the existing date field
- **MissionFormData**: add `date_end?: string`
- **`submitMission` in EntryNew**: pass `date_end` to `handleSubmit` → stored in `metadata.date_end` or as top-level column
- **`createEntry` in entries.ts**: accept and insert `date_end`
- **Entry type**: add `date_end?: string | null` to Entry interface
- **ENTRY_COLUMNS**: add `date_end`
- **Display (EntryCard/EntryDetail)**: location-first format:
  - Range: "Budapest, Hungary · Mar 5 – 12, 2026"
  - Single: "Budapest, Hungary · Mar 5, 2026"

## 3. Photo Limits by Type
- `PhotoUpload` receives `maxPhotos` prop (default 10)
- `usePendingPhotos` hook also receives `maxPhotos`
- `EntryNew.tsx` maps type to limit:
  - `mission`: 20
  - `night_out`: 15
  - all others: 10

## 4. Lore — Type-Based Photo Limits
- `generate-lore` edge function: remove `photoUrls.slice(0, 4)` hardcap
- Client (`src/ai/lore.ts`): send photo URLs based on entry type:
  - `mission`: all (up to 20)
  - `night_out`: all (up to 15)
  - all others: up to 4
- Mission lore prompt directive: "Weave a narrative across the full journey, referencing different moments captured in the photos."

## 5. Circle — Multi-Gent Relationships
- **DB migration**:
  ```sql
  CREATE TABLE person_gents (
    person_id uuid REFERENCES people(id) ON DELETE CASCADE,
    gent_id uuid REFERENCES gents(id) ON DELETE CASCADE,
    PRIMARY KEY (person_id, gent_id)
  );
  ```
- **On person create**: auto-insert the adding gent into `person_gents`
- **people.ts**: `fetchPersonGents(personId)`, `updatePersonGents(personId, gentIds[])`
- **PersonDetail page**: "Known by" section showing gent avatars with toggle buttons
- `added_by` remains for audit trail — `person_gents` drives the UI

## Constraints
- Design system: obsidian/gold/ivory, Playfair/Instrument Sans, no emojis
- DB migrations run manually in Supabase SQL Editor
- Lore uses `claude-sonnet-4-6` — 20 images will cost more but user approved
