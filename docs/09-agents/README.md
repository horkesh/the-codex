# Agent Roles — The Gents Chronicles

This project uses role-based subagents. Each agent has a defined scope to prevent context drift and keep sessions focused.

## Roles

| Role | File | Scope |
|---|---|---|
| Architect | `architect.md` | Structure, decisions, cross-cutting concerns |
| Frontend | `frontend.md` | React components, pages, styling, animations |
| Backend | `backend.md` | Supabase schema, Edge Functions, data layer |
| Studio | `studio.md` | Export templates, html-to-image, Instagram formats |
| Chronicle | `chronicle.md` | Memory, ledger updates, napkin curation |

## When to spawn a subagent

- When a task is clearly scoped to one role
- When work can be parallelized (e.g., building a component while also writing a migration)
- When protecting the main context window (e.g., reading all template files)

## Startup sequence

Every session, regardless of role:
1. Read `docs/00-overview/handover.md`
2. Read `docs/00-overview/execution_board.md`
3. Read `.claude/napkin.md`
4. Read last 2 entries in `docs/project_ledger.md`

Then read role-specific docs.
