# Verdict & Dossier — Feature Design

Status: Implemented. Both scan modes (Research + Scan) use Gemini 2.5 Flash. See ADR 0003 for history.

---

## Goal

Add a premium intake flow for evaluating a person from an image and turning that evaluation into a review-first dossier that can be saved into The Circle.

The feature should:

- accept a camera photo, uploaded photo, Instagram screenshot, or Instagram profile URL
- use AI to analyze the person and produce a private verdict
- generate a portrait avatar using the same protocol and visual language as Gent profile portraits
- build a ready-made dossier the user can edit
- route the person by score:
  - `8.0+` -> `contact`
  - `< 8.0` -> `person_of_interest`
- always require manual review before anything is saved

This feature is internally the "hotness scale" feature. In-product naming should be more premium:

- primary name: `Verdict & Dossier`
- optional CTA labels: `Scan Prospect`, `Create Dossier`, `Run Verdict`

---

## Locked Decisions

These decisions are now treated as feature rules.

### Review-first is mandatory

AI analysis never writes directly into `people`.

Flow is always:

1. capture / upload / analyze
2. show dossier review screen
3. allow edits
4. save only after explicit confirmation

### Routing rule

- `score >= 8.0` -> default category `contact`
- `score < 8.0` -> default category `person_of_interest`

User may override the category in the review screen before saving.

### Instagram identity rule

Instagram should be handled app-wide as follows:

- canonical identity field = handle only
- stored in `people.instagram`
- normalized to lowercase, without `@`
- full source URL is stored separately as provenance

For Instagram-origin flows:

- the final saved person must have a valid normalized handle
- if AI cannot extract it confidently, review screen requires manual entry before save

For plain camera / upload flows:

- Instagram remains optional

### Portrait protocol rule

Generated avatars for scanned people must use the same portrait protocol as Gent profile portraits:

1. analyze the source image into:
   - `appearance`
   - `traits` (6 words)
2. generate a stylized portrait from that analysis
3. preserve real skin tone and hair color
4. upload the portrait to Supabase Storage

This should feel visually consistent with Gent portraits, not like a separate art style.

---

## Product Experience

### Entry point

Best placement is inside Circle, replacing or expanding the current POI intake flow.

Recommended intake entry:

- existing Circle `+` action opens a richer intake modal

Recommended sources:

- `Instagram URL`
- `Instagram Screenshot`
- `Photo Upload`
- `Camera`

### Review screen

Nothing is saved before this screen.

The review screen should show:

- original source image
- generated portrait avatar
- score
- verdict label
- confidence
- recommended route:
  - `Add to Circle`
  - `Send to On the Radar`

Editable fields:

- `name`
- `instagram`
- `bio`
- `why_interesting`
- `best_opener`
- `green_flags`
- `watchouts`
- `private notes`
- `labels`
- `category`

Suggested disclosure:

`AI verdict only. Review and edit before saving.`

### Tone

The feature should feel private, witty, and premium, not cheap or cruel.

The score should not be the main personality of the screen. Lead with:

- verdict label
- confidence
- dossier summary

The number can remain present, but secondary.

---

## Verdict Model

### Numeric score

The canonical routing score is a decimal between `0.0` and `10.0`.

Use one decimal place.

### Verdict labels

Suggested bands:

| Score band | Label | Default route |
|---|---|---|
| `9.0 - 10.0` | `Immediate Interest` | `contact` |
| `8.0 - 8.9` | `Circle Material` | `contact` |
| `6.5 - 7.9` | `On the Radar` | `person_of_interest` |
| `0.0 - 6.4` | `Observe Further` | `person_of_interest` |

Important: the app should not auto-delete or auto-pass anyone based on a low score. Review-first means the user can still choose to save or cancel.

### Confidence

Confidence should be separate from score.

Recommended behavior:

- `>= 0.70` -> normal verdict
- `0.50 - 0.69` -> caution banner
- `< 0.50` -> do not present the score as authoritative; allow dossier draft only

### Eligibility gates

The verdict pipeline must reject or degrade gracefully for:

- multiple faces
- no clearly visible face
- explicit content
- minor or uncertain age
- heavily obscured face
- extremely low-quality source image

If rejected:

- do not score
- show a clear reason
- allow retake / replace image

---

## App-Wide Instagram Standard

### Canonical storage

Store handle only in `people.instagram`.

Do not store a full profile URL in that field.

### Provenance

Store the original pasted or inferred URL separately:

- `people.instagram_source_url`

This is for traceability, not identity.

### Normalization helpers

Create shared helpers and use them in all Instagram flows:

- `normalizeInstagramHandle(input: string): string | null`
- `getInstagramProfileUrl(handle: string): string`

Normalization rules:

1. trim whitespace
2. accept `@handle`, `handle`, or full Instagram URL
3. strip leading `@`
4. if URL, extract first path segment after host
5. lowercase
6. reject invalid results

Examples:

- `@Haris` -> `haris`
- `haris` -> `haris`
- `https://instagram.com/haris/` -> `haris`
- `https://www.instagram.com/haris/?hl=en` -> `haris`

### Why this matters

The app already behaves this way informally:

- `POIModal` extracts `username`
- `PersonDetail` builds links from handle
- avatar fallback uses `unavatar.io/instagram/{handle}`

This feature should formalize that rule across the whole app.

---

## Data Model

## `people` changes

Recommended additions:

- `portrait_url text null`
- `instagram_source_url text null`

Keep existing fields:

- `photo_url` = real/source photo
- `instagram` = canonical handle
- `poi_intel` = dossier summary for `person_of_interest`

Do not overload `photo_url` with the generated portrait. Source photo and generated avatar are different assets.

### Optional future additions to `people`

- `appearance_description text null`
- `last_scan_id uuid null`

These are optional. They are nice to have, but not required for MVP if a scan table is introduced.

## New table: `person_scans`

Add a dedicated table for AI verdict runs and review state.

Suggested fields:

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | primary key |
| `created_by` | `uuid` | references `gents.id` |
| `person_id` | `uuid null` | references `people.id`, filled on confirm |
| `source_type` | `text` | `instagram_url`, `instagram_screenshot`, `photo_upload`, `camera_capture` |
| `source_photo_url` | `text null` | uploaded image used for verdict |
| `instagram_handle` | `text null` | normalized handle if present |
| `instagram_source_url` | `text null` | original URL if present |
| `generated_avatar_url` | `text null` | portrait output |
| `appearance_description` | `text null` | visual analysis output |
| `trait_words` | `text[]` | exactly 6 words where possible |
| `score` | `numeric(3,1) null` | verdict score |
| `verdict_label` | `text null` | display label |
| `confidence` | `numeric(3,2) null` | separate from score |
| `recommended_category` | `text null` | `contact` or `person_of_interest` |
| `display_name` | `text null` | suggested / edited |
| `bio` | `text null` | suggested / edited |
| `why_interesting` | `text null` | dossier field |
| `best_opener` | `text null` | dossier field |
| `green_flags` | `text[]` | dossier field |
| `watchouts` | `text[]` | dossier field |
| `review_payload` | `jsonb` | raw merged review state |
| `status` | `text` | `draft`, `confirmed`, `discarded` |
| `created_at` | `timestamptz` | default now |
| `updated_at` | `timestamptz` | default now |

### Why a scan table is recommended

It allows:

- review-first without prematurely creating a person
- audit trail for AI outputs
- retries and portrait regenerations
- future rescan support
- keeping AI state out of the core `people` record

---

## Storage

### Source images

Use existing `people-photos` bucket for uploaded source photos.

Recommended path:

- `scans/{scan_id}/source.jpg`

### Generated portraits

Use the existing `portraits` bucket, but separate scanned people from Gents via path.

Recommended path:

- `people/{scan_id}/portrait.png`

This keeps the portrait pipeline visually unified while keeping paths distinguishable.

---

## AI Architecture

The feature should reuse current AI systems where possible.

### Existing flow to reuse

`supabase/functions/analyze-instagram/index.ts`

Current outputs already include:

- `display_name`
- `username`
- `bio`
- `apparent_location`
- `apparent_interests`
- `suggested_approach`
- `notable_details`

This should remain the enrichment source for Instagram-origin inputs.

### New function: `scan-person-verdict`

Purpose:

- image-based verdict analysis only
- no portrait generation
- no final save

Responsibilities:

1. validate image quality and eligibility
2. determine if there is one clear adult face
3. generate `appearance`
4. generate 6 `traits`
5. produce score, verdict, confidence, dossier summary
6. return recommended category

This function should use image-capable AI. Given the current stack, Gemini vision is the most natural fit.

### New function: `generate-person-portrait`

Purpose:

- portrait generation only
- same protocol as `generate-portrait`

Responsibilities:

1. accept source image or precomputed `appearance` + `traits`
2. run the same appearance / traits analysis if needed
3. build portrait prompt using the same style rules as Gent portraits
4. generate image
5. upload to storage
6. return `portrait_url`

### Shared portrait protocol

This feature should not create a second portrait style.

Shared visual rules:

- preserve actual skin tone and hair color
- high-end digital painting
- dark elegant background
- no labels or text

If implementation allows, extract shared prompt-building logic so Gent portraits and scanned-person portraits stay aligned.

---

## AI Response Contracts

## `scan-person-verdict` response

```json
{
  "eligible": true,
  "rejection_reason": null,
  "face_count": 1,
  "age_gate": "adult_clear",
  "image_quality": 0.88,
  "appearance": "Warm medium skin tone, dark wavy hair, expressive eyes, strong jawline, polished casual style.",
  "traits": ["confident", "playful", "stylish", "social", "composed", "magnetic"],
  "score": 8.3,
  "verdict_label": "Circle Material",
  "confidence": 0.79,
  "recommended_category": "contact",
  "vibe": "Polished, confident, high social presence.",
  "style_read": "Intentional look with strong visual confidence.",
  "why_interesting": "Immediately stands out and reads as socially self-possessed.",
  "best_opener": "Open with a light comment about style or setting.",
  "green_flags": ["Strong presence", "Clear personal style", "Approachable energy"],
  "watchouts": ["Assessment based on one image only"],
  "suggested_name": null,
  "notes_for_review": "Single clear adult face detected."
}
```

## Review payload

The client should merge:

- Instagram enrichment output
- verdict output
- portrait output

into one editable review state before save.

---

## UI Architecture

### Recommended approach

Evolve the current Circle POI intake flow rather than creating a disconnected standalone page.

Best options:

1. Expand `POIModal` into a broader intake modal with three source tabs
2. Rename it later to `ProspectIntakeModal` for clarity

Source tabs:

- `Instagram`
- `Screenshot`
- `Photo`

### Screen states

Recommended state model:

- `input`
- `analyzing`
- `review`
- `saving`

### Review layout

Top section:

- source image
- generated portrait
- verdict card

Middle section:

- dossier fields
- Instagram section

Bottom section:

- category selector
- save CTA
- cancel / discard

Suggested CTA copy:

- if `score >= 8.0`: `Add to Circle`
- if `< 8.0`: `Send to On the Radar`

### Duplicate handling

Before final save:

- if normalized `instagram` matches an existing person, do not silently create a duplicate
- instead show:
  - `Existing profile found`
  - options:
    - update existing
    - keep both
    - cancel

Recommended app-wide safeguard:

- partial unique index on lowercased non-null `instagram`

---

## Repo Architecture Proposal

Follow existing layer rules: data -> hook -> page/component.

### Client modules

- `src/lib/instagram.ts`
  - normalization helpers
- `src/ai/personVerdict.ts`
  - invoke `scan-person-verdict`
- `src/ai/personPortrait.ts`
  - invoke `generate-person-portrait`
- `src/data/personScans.ts`
  - CRUD for scan drafts
- `src/hooks/useVerdictIntake.ts`
  - orchestration for analyze -> review -> save
- `src/components/circle/POIModal.tsx`
  - expanded or replaced by broader intake UI

### Data layer rules

- all Supabase table access remains in `src/data/*.ts`
- all AI calls remain in `src/ai/*.ts`
- pages orchestrate only

---

## Save Logic

On confirm:

1. normalize Instagram handle
2. validate handle if source type is Instagram-origin
3. persist or update `person_scans` in `draft` state
4. create `people` record with:
   - `category`
   - `name`
   - `instagram`
   - `instagram_source_url`
   - `photo_url`
   - `portrait_url`
   - `notes` and / or `poi_intel`
5. link `person_scans.person_id`
6. set scan status to `confirmed`

Category mapping:

- `contact` for `score >= 8.0`
- `person_of_interest` for `score < 8.0`

User override is respected at the final step.

---

## Validation and Safety

The feature should explicitly enforce:

- one clear adult face
- no minors
- no uncertain-age saves without user intervention
- no explicit content
- clear low-confidence warnings

If a source fails validation:

- show reason
- do not score
- allow replace image

This protects the feature from fake precision and poor inputs.

---

## MVP Scope

### MVP

- photo upload
- camera capture
- Instagram screenshot
- verdict analysis
- portrait generation
- review screen
- save into `people`
- route by `8.0`
- canonical Instagram normalization
- separate `portrait_url`

### Post-MVP

- Instagram URL-only enrichment merged into review
- duplicate resolution UI
- rescan from existing person profile
- regenerate portrait only
- richer dossier history from `person_scans`

---

## Implementation Phases

### Phase 1 — Schema and contracts

- add `portrait_url` and `instagram_source_url` to `people`
- add `person_scans`
- regenerate `src/types/database.ts`
- extend app types
- add Instagram normalization helpers

### Phase 2 — Edge functions

- implement `scan-person-verdict`
- implement `generate-person-portrait`
- keep `analyze-instagram` as enrichment source

### Phase 3 — Client orchestration

- add `src/ai/personVerdict.ts`
- add `src/ai/personPortrait.ts`
- add `src/data/personScans.ts`
- add review-state hook

### Phase 4 — UI

- expand or replace `POIModal`
- add source tabs
- add review screen
- add duplicate handling

### Phase 5 — Save flow and polish

- final save into `people`
- category routing
- portrait display in Circle / Person Detail
- confidence and validation messaging

---

## Testing Checklist

### Functional

- upload photo -> review -> save as `contact`
- upload photo -> review -> save as `person_of_interest`
- screenshot -> extracted handle -> review -> save
- screenshot with missing handle -> review blocked until handle entered
- duplicate Instagram handle -> duplicate resolution shown
- portrait generation succeeds and stores separate `portrait_url`

### Edge cases

- multiple faces
- blurred face
- low-light face
- underage / uncertain age
- explicit image
- AI timeout on verdict
- AI timeout on portrait generation

### Regression

- existing Circle add-contact flow still works
- existing POI flow still works until replaced
- PersonDetail still links correctly to Instagram
- avatar fallback remains correct when portrait is missing

---

## Recommendation Summary

This feature should be built as a unified, premium intake flow that merges:

- existing Instagram screening
- new image-based verdicting
- the same portrait generation protocol used for Gents

The cleanest long-term shape is:

- canonical Instagram handle in `people.instagram`
- provenance stored separately
- generated avatar stored separately from source photo
- a dedicated `person_scans` table for review-first AI state

That gives the app a strong, reusable foundation rather than a one-off novelty feature.
