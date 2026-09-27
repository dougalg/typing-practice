# Implementation Plan: Practice History Refinements

**Branch**: `002-history-refinements` | **Date**: 2026-09-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-history-refinements/spec.md`

## Summary

Two user-facing changes and one test-platform change.

1. **Confirm before discarding** (US1): pressing Load while a session is in progress opens a native
   `<dialog>` (via `showModal()`) asking to discard. Cancel or Escape restores the session and returns
   focus to the Load button that was pressed; confirming loads as today. `PracticeView` gains an
   `onTypingStarted` callback so `App` knows a session has been touched.
2. **Loaded and completed counts** (US2): `recordPractice` increments `numberOfLoads` again (a new
   entry starts at 1), and each entry shows "Loaded: N" and "Completed: N". A schema version 4 upgrade
   raises any stored load count below 1 or below its completed count.
3. **Test platform** (user decision, 2026-09-27): move the whole Vitest suite from jsdom to **Vitest
   browser mode** (Playwright provider, Chromium). Real `<dialog>`, focus, layout, colour and IndexedDB
   make the confirm dialog testable and let the remaining manual checks from `001` become automated
   tests: old-data upgrade (`A16`), storage failure, screen-reader announcements, reflow and contrast.

Order: migrate the existing suite first with no behavior change, then close `001`'s carried-over
checks, then build the two user stories test-first. Details in [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript ~7.0 (strict), React 19

**Primary Dependencies**: Dexie 4, `dexie-react-hooks` 4, Tailwind CSS v4 (unchanged). Test-only
changes: add `@vitest/browser-playwright` 5.0.1, `playwright`, `@guidepup/virtual-screen-reader`;
remove `fake-indexeddb` and `jsdom` once the migration is green

**Storage**: IndexedDB via Dexie, `savedTextsDb`. Schema version 4 (same stores as version 3, upgrade
function only)

**Testing**: Vitest 5 in browser mode, Chromium via Playwright, headless. Testing Library queries kept.
Real input events from `vitest/browser`'s `userEvent` where native behavior matters (dialog Escape,
Tab containment). `axe-core` via the existing `src/test/a11y.ts`. Screen-reader output via
`@guidepup/virtual-screen-reader`

**Target Platform**: Evergreen desktop and mobile browsers, static hosting (unchanged)

**Project Type**: Single-page web app, frontend only

**Performance Goals**: Dialog opens in the same interaction as the Load press. The suite gets slower than
jsdom's ~3 s; per-cycle full runs stay acceptable if it remains under ~30 s (to be measured after the
migration and recorded in the TDD profile)

**Constraints**: Local-only, offline (unchanged); Playwright browser binaries must be installed
locally (`pnpm exec playwright install chromium`), a one-off download

**Scale/Scope**: Touches `App.tsx`, `PracticeView.tsx`, `Sidebar.tsx`, `SavedTextItem.tsx`,
`history.ts`, `db.ts`, `Page.tsx` (reflow fix, if the new test fails as expected), one new component,
test config and setup

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                | Assessment                                                                                                                                                                                                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Local-First           | Pass. No network. Version 4 adds an upgrade path that only raises counts, preserving all data.                                                                                                                                                                               |
| II. Strict Types         | Pass. No new shared types beyond props; `SavedText` unchanged in shape, only its `numberOfLoads` comment changes back from "legacy".                                                                                                                                         |
| III. TDD                 | Pass. Migration is its own step on a green suite (no behavior change, test counts identical before and after). `PracticeView` has no tests, so characterization comes before adding `onTypingStarted`. Every 002 behavior gets a failing test first. `A16` becomes drivable. |
| IV. Structure            | Pass. Tests stay beside code; no separate `e2e/` folder is needed, which browser mode makes possible. New `ConfirmDiscardDialog` is presentational in `components/`.                                                                                                         |
| V. Accessible by Default | Strengthened. Real-browser axe (contrast now checkable), reflow at 320 CSS px, and screen-reader output assertions. Closes the known gap for `PracticeView` (touched here, so it gets an axe check). `SetupView` still has none; noted, out of scope.                        |
| Technology & Tooling     | **Amendment needed**: the constitution names "Vitest with jsdom". Changing to browser mode is the user's decision; the amendment is a task (MINOR bump, 1.2.0 → 1.3.0), shown to the user before it is applied. New dev dependencies justified in the PR.                    |

## Project Structure

### Documentation (this feature)

```text
specs/002-history-refinements/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── history-module.md
│   └── ui.md
└── tasks.md             # /speckit-tasks, not created here
```

### Source Code

```text
vite.config.ts                         # test.browser: { enabled, provider: playwright(), instances: [chromium] }
package.json                           # scripts unchanged; deps as above
src/
├── App.tsx                            # sessionTouched, pendingLoad, dialog wiring
├── App.test.tsx                       # 002 acceptance; A16 through the real app
├── components/
│   ├── ConfirmDiscardDialog.tsx       # NEW: native <dialog>, showModal()
│   ├── ConfirmDiscardDialog.test.tsx  # NEW
│   └── SavedTextItem.tsx              # "Loaded: N", "Completed: N"
├── features/savedItems/
│   ├── db.ts                          # version(4) count correction
│   └── history.ts                     # recordPractice increments numberOfLoads
├── layouts/Page.tsx                   # stack columns on narrow widths (if reflow test fails)
├── test/
│   ├── setup.ts                       # drop fake-indexeddb; keep cleanup + table clear
│   ├── a11y.ts                        # unchanged
│   └── screenReader.ts                # NEW: thin helper over virtual-screen-reader
└── views/
    ├── PracticeView.tsx               # onTypingStarted
    ├── PracticeView.test.tsx          # NEW: characterization, then onTypingStarted, axe
    └── Sidebar.tsx                    # passes the trigger element with onLoadRequest
```

**Structure Decision**: Existing single-project layout (Principle IV). Browser mode lets every new
real-browser test sit beside the code it covers.

## Complexity Tracking

No violations. The tooling amendment is a user-directed decision, handled as an explicit constitution
task rather than a deviation.
