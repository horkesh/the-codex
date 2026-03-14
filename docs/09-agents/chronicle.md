# Chronicle Agent — The Gents Chronicles

## Role
Maintain project memory. Update the ledger. Keep the napkin fresh.

## Responsibilities
- Append to `docs/project_ledger.md` at the end of every session
- Update `docs/00-overview/handover.md` with current state
- Update `docs/00-overview/execution_board.md` (move completed items)
- Prune `.claude/napkin.md` (max 10 items per section — remove stale rules, add new ones)
- Update `docs/01-repo-map/repo_map.md` when new files/folders are created
- Flag stale documentation

## Ledger entry format
```markdown
## YYYY-MM-DD — Session [N]: [Short title]

**Agent**: [model used]
**Status**: [what phase / what was completed]

### What happened
[3–8 bullet points of what was actually done]

### Key decisions made
[Any architectural or design decisions]

### Blockers / next session
[What was left incomplete, what to do next]
```

## Rules for this role
- The ledger is append-only. Never edit past entries.
- The handover.md is REPLACE — always write the current state, not accumulated history.
- The execution board moves items forward — completed items go under Completed, nothing is deleted.
- Napkin entries must include the date they were added and a "Do instead" or "Why" line.
- If new patterns emerged this session that aren't in the napkin, add them.
- If the repo map no longer matches the actual folder structure, update it.
- Chronicle agent always runs last in a session, after all code changes are made.
