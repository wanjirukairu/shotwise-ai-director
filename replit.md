# ShotWise AI Director

ShotWise is a full-production directing companion for feature films, episodic work, music videos, documentaries, AI-generated films, and hybrid productions.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/shotwise/src/App.tsx` — Clerk provider, public/auth routes, and authenticated app shell
- `artifacts/shotwise/src/pages/Workspace.tsx` — project library and multi-scene project workspace
- `artifacts/shotwise/src/pages/SceneRoom.tsx` — scene-level directing room and streamed revisions
- `artifacts/shotwise/src/pages/Planner.tsx` — shoot-day planning across projects and scenes
- `artifacts/shotwise/src/index.css` — ShotWise visual theme and responsive styling
- `artifacts/api-server/src/routes/gemini.ts` — Google Gemini scene analysis and streamed revision endpoints
- `artifacts/api-server/src/routes/projects.ts` — authenticated project listing, loading, and updates
- `lib/db/src/schema/projects.ts` — user-owned scene, message, shot-list, and production-note persistence
- `lib/api-spec/openapi.yaml` — source of truth for the typed Gemini API contract

## Architecture decisions

- Replit-managed Clerk owns sign-up/sign-in; all project and Gemini routes resolve the signed-in user server-side.
- Projects contain ordered scenes; each scene owns its conversation, shot list, lock state, resource profile, and production notes.
- Shoot days reference source shots across multiple scenes without copying or overwriting scene data.
- Gemini is called server-side with `@google/genai` so the director's API key never reaches the browser.
- Follow-ups send only a project ID and new director message from the browser. The server loads compact saved context, streams the assistant message, then persists the complete revised list.

## Product

- Create full projects and navigate independently editable scenes or sequences within them.
- Plan shoot days by pulling shots from multiple scenes into an ordered production schedule.
- Choose live-action, AI-generated, music-video, documentary, or hybrid production formats.
- Generate an initial, story-aware shot list with creative rationale, practical cost, and feasibility.
- Continue the conversation to challenge choices, request cheaper alternatives, and revise the full list.
- Toggle Challenge Mode at any point: normal mode responds directly, while Challenge Mode asks for emotional, narrative, and practical purpose before accepting a proposed shot.
- Every shot is rated green/yellow/red against the director's stated budget, available equipment, and crew experience, with cheaper alternatives for over-resource choices.
- Setup-time estimates are ranges; director-entered overrides are authoritative for saved planning, AI revisions, and exports.
- Each shot can be flagged practical or AI-generated. Creative fields remain consistent while production details switch between physical resources and AI compute, tools, iteration, consistency, and post needs.
- Shot cards include a local, copyright-safe visual previs diagram derived from framing, angle, movement, lighting, and composition.
- Each shot includes attribution-only technique references plus links to verified freely accessible filmmaking articles and interview channels; copyrighted frames and excerpts are never reproduced.
- Reopen saved scenes, browse shot-list archives, and maintain production notes after refresh or a later sign-in.
- Expand shot cards for camera, lighting, composition, gear, crew, timing, location, VFX, and budget notes.
- Lock the list, copy a concise version, or export a crew-ready text file.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The Gemini endpoint uses the current model name supported for newly provisioned Google API keys.
- Keep OpenAPI schemas entity-shaped and rerun codegen after contract changes.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
