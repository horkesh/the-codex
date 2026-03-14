# Session Start Protocol — The Gents Chronicles

Run this every time you open a new session on this project.

## Step 1 — Orient (2 min)
1. Read `docs/00-overview/handover.md` — current state and blockers
2. Read `docs/00-overview/execution_board.md` — what's active, what's next
3. Read `.claude/napkin.md` — recurring rules (never skip this)
4. Skim `docs/project_ledger.md` (last 2 entries) — recent history

## Step 2 — Confirm scope
Ask the user what they want to work on today if not already stated.
Map the request to an epic in the execution board.
If it's a new epic, update execution_board.md before writing code.

## Step 3 — Architecture check
Before touching any code, confirm:
- Does this fit the existing data model? (`docs/03-architecture/data_model.md`)
- Does this use the correct AI integration pattern? (`docs/03-architecture/ai_integration.md`)
- Does this follow the design system? (`docs/03-architecture/design_system.md`)
- Is the component pattern correct? (data layer → helper → component — never mix)

## Step 4 — Work
Follow patterns. Read before editing. Update docs when architecture changes.

## Step 5 — Close session
1. Update `docs/00-overview/handover.md` with current state
2. Append entry to `docs/project_ledger.md`
3. Update `docs/00-overview/execution_board.md` (move completed items)
4. Update `.claude/napkin.md` if new rules emerged

## Rules that cannot be skipped
- Never write code without reading the relevant architecture docs first
- Never create a new pattern without documenting it
- Always update the ledger at session end — even if just 3 lines
- Data layer (`*Data.ts`) is never mixed with component files
- API keys are never in client code — always via Supabase Edge Functions
