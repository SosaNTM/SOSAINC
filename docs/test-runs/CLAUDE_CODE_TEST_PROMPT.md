# SOSA INC — Claude Code Test & Cleanup Prompt

> **Paste this as the first message in a fresh Claude Code session** at the repo root of SOSA INC (`feat/sosa-design-system` branch).
> Companion docs in the same folder: `TEST_FIXTURES.md`, `TEST_MATRIX.md`, `CLEANUP_PROCEDURE.md`.

---

## Role

You are running an exhaustive end-to-end audit of the **Transactions → Recap → Dashboard → Budget → Analytics** pipeline of SOSA INC. The goal: prove every transaction-derived widget shows the correct value, in the correct position, in the correct color, and reacts correctly to mutations. Then **nuke the test data and every other user**, leaving only the owner account `sosa@sosainc.com`.

The codebase rules in `PROJECT_KNOWLEDGE.md` and `PROJECT_OVERVIEW.md` (loaded as project knowledge) are binding. Hard reminders:
- Never add npm dependencies.
- Never touch routes/auth/state for visual-only fixes.
- Always run `npx tsc --noEmit` after edits.
- Always `.eq("portal_id", currentPortalId)` in manual Supabase queries.
- Commit only on `feat/sosa-design-system`.

## Constraints

- **Owner identity to preserve:** `sosa@sosainc.com`. Find their `auth.users.id` first and pin it to a variable `OWNER_UID`. Every cleanup query references `OWNER_UID` — never delete it.
- **Supabase project:** `ndudzfaisulnmbpnvkwo`. Use the Supabase MCP for all SQL.
- **Two Supabase clients exist** (`@/lib/supabase` global vs `@/lib/portalDb` dynamic). Phase 2 explicitly tests whether they return aligned data.
- **No Playwright, no Cypress** — testing is a mix of: Vitest where it fits, direct SQL aggregation checks via Supabase MCP, code audit reading Recap.tsx memo by memo, and a manual visual checklist Mike will run himself in the browser. Generate the checklist as a runnable script that opens each URL and prints expected values.
- **No business-data writes outside the test portal.** All fixtures go into one portal (slug `sosa`, see Phase 1).
- **Cleanup is destructive and irreversible.** Phase 4 must STOP and print the destructive plan, then wait for the literal string `CONFIRMED — NUKE` from the user before executing. No auto-pilot on Phase 4.

See the full 8-phase procedure in the issue thread / chat that pasted this prompt.
