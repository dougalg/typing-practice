# Implementation Plan: Practice History in the Sidebar

**Branch**: `worktree-001-practice-history` | **Date**: 2026-09-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-practice-history/spec.md`

## Summary

Turn the existing "saved texts" sidebar into a working practice history. Starting a practice
(from typed text or from the sidebar) upserts one entry per distinct text, refreshing its
last-practiced date. Finishing a text, with or without mistakes, bumps its practice count, which is
the only count the sidebar shows. The sidebar lists every entry, most recent first, with a preview,
date and that count. Its Load control starts a fresh session with that entry's full text. Reset
always returns to an empty setup text box.

Approach, from [research.md](./research.md): keep the existing Dexie store as the single source of
truth and add a small `features/savedItems/history.ts` module that owns text normalisation,
upsert-by-text, practice counting on completion and a live list hook. A two-step Dexie migration removes the
duplicate rows that the current "add on every start" behaviour created and then enforces one row
per text with a unique index. `App` lifts the active practice text and a run counter so a Load can
restart practice mid-session (the practice view is remounted through a `key`). Storage failures are
caught at the module boundary so practice keeps working and the user is told. If two tabs race to
insert the same new text, the loser retries once as an update instead of reporting a failure.

## Technical Context

**Language/Version**: TypeScript ~7.0 (strict, `erasableSyntaxOnly`, `verbatimModuleSyntax`), React 19

**Primary Dependencies**: Dexie 4 with `dexie-react-hooks` 4 (already installed), Tailwind CSS v4. New dev-only: `fake-indexeddb`, `vitest-axe` (see Constitution Check)

**Storage**: IndexedDB through Dexie, database `savedTextsDb`, table `savedTexts`. Schema moves from version 1 to version 3

**Testing**: Vitest 5 with jsdom, Testing Library (`@testing-library/react`, `user-event`, `jest-dom`); `fake-indexeddb` supplies IndexedDB in jsdom; `vitest-axe` supplies accessibility checks

**Target Platform**: Modern evergreen desktop and mobile browsers, served as static files from Vite `dist/`

**Project Type**: Single-page web app (frontend only, no backend)

**Performance Goals**: Sidebar reflects a change in the same interaction (no manual refresh); loading an entry starts a session with no perceptible delay, because the session does not wait on the storage write

**Constraints**: Offline-capable and local-only (no network calls); practice must remain usable if IndexedDB is unavailable; existing users' data must survive the upgrade

**Scale/Scope**: One user per browser profile; comfortable at 100+ entries with texts of thousands of characters; three touched views/components (`App`, `Sidebar`, `SavedTextItem`) and one feature module

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment (pre-research) | Assessment (post-design) |
|-----------|---------------------------|--------------------------|
| I. Local-First, No Backend | Pass. Only IndexedDB is used and nothing leaves the device. Schema change adds `version(2)` and `version(3)` with an upgrade that preserves data (FR-012, FR-015). | Pass. Migration merges duplicate rows and sums counts, so no data is lost; covered by a test seeded with v1 data. |
| II. Strict Type Safety | Pass, with one tidy-up: `SavedText` is declared in `db.ts` and its fields are redeclared in `SavedTextItemProps`. | Pass. `SavedText` moves to `src/types.ts` (already the home of shared domain types), so `db.ts`, the feature module and the presentational component all import the one definition without `components/` importing from `features/`. No `any`. |
| III. Test-Driven Development (renamed from "Test-First for Behavior" in constitution 1.2.0) | Pass. Every requirement has a testable behaviour. | Pass. Pure logic (`normalizeText`, migration merge) is extracted and unit-tested. The upsert, completion and live-list behaviour is tested against `fake-indexeddb`. UI is tested through roles and real user events. |
| IV. Feature-Oriented Structure | Pass, with a fix: `App.tsx` calls `savedTextsDb.savedTexts.add(...)` directly, which breaks "views access persistence only through a feature module". | Pass. All persistence goes through `features/savedItems/history.ts`. Components stay presentational. Tests sit beside code. |
| V. Accessible by Default | Pass in intent. This is the feature that needs `vitest-axe`, which the constitution's follow-up note says to add with the first accessibility test. | Pass. axe checks in each state of `Sidebar` and `SavedTextItem`, keyboard-only Load test, focus lands on the typing input after Load, storage errors use `role="alert"`, "practiced/completed" is text and not colour. Contrast and 200% zoom are manual PR checks (see [quickstart.md](./quickstart.md)). |

**Justified additions** (not violations): two dev dependencies. `fake-indexeddb` is required
because jsdom has no IndexedDB and the requirements are about persistence. `vitest-axe` is required
by Principle V. Both are dev-only, so they add no runtime weight. To be stated in the PR
description per the Technology & Tooling Constraints.

**Known gap, out of scope**: `SetupView` and `PracticeView` have no axe tests yet, which the
constitution requires of every view. This feature touches them only to pass a `key` and callbacks, so
adding their axe tests is left as a follow-up, and the PR should say so.

## Project Structure

### Documentation (this feature)

```text
specs/001-practice-history/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── history-module.md
│   └── sidebar-ui.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── types.ts                          # + SavedText (moved from db.ts)
├── App.tsx                           # owns active practice text + run counter; wires Sidebar, recording
├── App.test.tsx                      # NEW: end-to-end flow tests (start, load, complete, error)
├── components/
│   ├── SavedTextItem.tsx             # preview, last practiced, practice count, named Load button
│   └── SavedTextItem.test.tsx        # NEW
├── features/
│   └── savedItems/
│       ├── db.ts                     # schema v2 (dedupe upgrade) and v3 (unique text index)
│       ├── db.test.ts                # NEW: migration from v1 data
│       ├── history.ts                # NEW: normalizeText, recordPractice, recordCompletion, useHistory
│       └── history.test.ts           # NEW
├── test/
│   └── setup.ts                      # + fake-indexeddb/auto, vitest-axe matcher, DB reset helper
└── views/
    ├── Sidebar.tsx                   # full list, empty state, error notice; uses useHistory
    └── Sidebar.test.tsx              # NEW
```

**Structure Decision**: Keep the existing single-project layout from constitution Principle IV.
There is exactly one new module (`history.ts`) because upsert/completion/list logic is shared by
`App` and `Sidebar`, and persistence must sit behind a feature module. No new directories other than
`specs` artifacts.

## Complexity Tracking

No constitution violations. Nothing to justify beyond the two dev dependencies noted above.
