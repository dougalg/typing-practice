---
description: "Task list for Practice History Refinements"
---

# Tasks: Practice History Refinements

**Input**: Design documents from `/specs/002-history-refinements/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/history-module.md, contracts/ui.md, quickstart.md

**Tests**: Mandatory. Constitution Principle III (Test-Driven Development) requires every behavior change to be driven by a test that failed first. In every story phase, write the test tasks first and observe them fail for the right reason before starting the implementation tasks.

**Behavior markers**: `[A#]` and `[U#]` are behavior ids from `tdd/test-list.md`. `/speckit-tdd-run` ticks a task only when every behavior it names is `DONE`; tasks without markers (Phase 1 and most of Phase 5) are left for `/speckit-implement`. Do not remove the markers.

**Precondition for the loop**: Phase 1 (T001-T009) must be finished before the first TDD cycle. The dialog behaviors cannot fail for the right reason under jsdom (no `showModal()`), so the loop treats Phase 1 as its preflight.

**Organization**: Setup migrates the suite to Vitest browser mode with no behavior change. Foundational closes the checks carried over from `001` that browser mode makes testable. Then one phase per user story. All paths are relative to the repository root.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story the task belongs to (US1, US2)

---

## Phase 1: Setup (move the suite to Vitest browser mode)

**Purpose**: Run the existing suite in a real browser with no behavior change (research.md R1, R2). Must end with the same 109 tests, same names, all green.

- [x] T001 Record the jsdom baseline: run `pnpm test` and note the pass count (109) and wall time in `specs/002-history-refinements/tdd/cycle-log.md` (create the file with a Baseline entry if `/speckit-tdd-plan` has not).
- [x] T002 Add the approved dev dependencies with `pnpm add -D @vitest/browser-playwright@5.0.1 playwright @guidepup/virtual-screen-reader`, then install the browser once with `pnpm exec playwright install chromium`. Never edit `pnpm-lock.yaml` by hand.
- [x] T003 Switch `vite.config.ts` from `environment: "jsdom"` to `test.browser: { enabled: true, provider: playwright(), headless: true, instances: [{ browser: "chromium" }] }` (import `playwright` from `@vitest/browser-playwright`), keeping `setupFiles: ["./src/test/setup.ts"]`. Confirm the exact option names against the installed `@vitest/browser-playwright` 5.0.1 types before relying on them.
- [x] T004 Update `src/test/setup.ts`: remove the `fake-indexeddb/auto` import (the browser has real IndexedDB); keep the `cleanup()` and `savedTextsDb.savedTexts.clear()` `afterEach` hooks, which become load-bearing because real IndexedDB persists across test files.
- [x] T005 Run `pnpm test` under browser mode. For every test that fails for platform reasons (expected: `vi.useFakeTimers({ toFake: ["Date"] })`, tests that `close()`/`open()` `savedTextsDb`, timing jsdom made synchronous), fix the test's mechanics without weakening any assertion, and record each fix in `tdd/cycle-log.md`. Done when the suite is back to 109 passed with the same test names, repeated 3 times clean. Record the new wall time.
- [x] T006 Remove the now-unused dev dependencies with `pnpm remove fake-indexeddb jsdom`; confirm `pnpm test` and `pnpm build` still pass.
- [x] T007 Amend `.specify/memory/constitution.md` (approved by the user, 2026-09-27), in the same commit as T003-T006: Technology & Tooling "Vitest with jsdom and Testing Library" becomes "Vitest in browser mode (Playwright provider, Chromium) with Testing Library"; Principle V's "Because jsdom cannot compute rendered contrast, ..." becomes "contrast is checked by axe in the real browser"; update the Sync Impact Report; version 1.2.0 → 1.3.0; Last Amended 2026-09-27.
- [x] T008 Refresh `.specify/memory/tdd-profile.md` for browser mode (run `/speckit-tdd-setup refresh`): runner, verified single-test and suite commands, wall time, the acceptance layer now being a real browser, and `src/test/screenReader.ts` as a helper once T009 exists.
- [x] T009 Create `src/test/screenReader.ts`: a helper that runs `@guidepup/virtual-screen-reader` over a container and returns its spoken-phrase log, so tests can assert what a screen reader announces and in what order. Prove it works under browser mode with a throwaway test (a labelled button is announced by role and name), then delete the throwaway. If it cannot run under Vitest 5 browser mode, stop and report (research.md R7 fallback).

**Checkpoint**: Same suite, real browser, green. Only now may 002 behavior work start.

---

## Phase 2: Foundational (checks carried over from `001`)

**Purpose**: Turn `001`'s remaining manual checks into tests, now that a real browser runs them (research.md R4, R8, R9). These tests guard existing behavior, so most should pass on first run; each first-run pass needs a deliberate-mutant check before it is trusted.

- [ ] T010 [P] [U1] [U2] [U3] [U4] [U5] [U6] [U7] Write `src/views/PracticeView.test.tsx` characterization tests for the untouched view before T021 changes it: renders the target text and a focused typing input when running; a correct character advances; a wrong character shows the error and does not advance; typing the whole text calls `onFinish` once; Reset calls `onReset`; plus an axe check (`expectNoA11yViolations`) in the running and finished states. These must pass on the current code; verify each with a deliberate mutant.
- [x] T011 [P] [A17] Add the old-data upgrade test to `src/App.test.tsx` (closes `001`'s `A16`): `savedTextsDb.close()`, delete the `savedTextsDb` database, seed it with a raw version-1 Dexie instance (schema `++id, dateCreated, dateLastUsed, text`) including duplicate rows of one text, close that instance, `await savedTextsDb.open()`, render `App`, and assert the sidebar shows one entry per text.
- [x] T012 [A18] Add a storage-unavailable test to `src/App.test.tsx` (after T011, same file): make IndexedDB unusable before the database opens (stub Dexie's `indexedDB` dependency so `open` fails), render `App`, and assert practice can still start and the sidebar shows an alert. If the stub cannot be made to work, fall back to the existing `close()`-based failure tests and record why (research.md R9).
- [x] T013 [A19] Add a reflow guard to `src/App.test.tsx` (after T012, same file): with the viewport set to 320 CSS px wide (`page.viewport` from `vitest/browser`) and a populated history, assert `document.documentElement.scrollWidth <= clientWidth` and that each sidebar entry's Load button is fully inside the viewport. Verify non-vacuous with a deliberate mutant (a fixed-width element wider than 320 px).
- [x] T014 [P] [U27] Add a contrast check to `src/views/Sidebar.test.tsx`: a populated sidebar passes `expectNoA11yViolations`, and a deliberate low-contrast mutant (temporarily near-white text on the entry) makes axe's `color-contrast` rule fail, proving the rule now computes colours in the real browser.
- [x] T015 [P] [U28] [U29] [U30] [U31] [U32] [U33] Add screen-reader tests to `src/views/Sidebar.test.tsx` using `src/test/screenReader.ts` (after T014, same file): the region is announced as "Practice History"; entries are read newest first; each Load button is announced as "Load" plus that entry's text; the empty-state message is read; both alerts are announced.

### Acceptance confirmation for the carried-over checks

- [x] T035 [A17] Confirm A17 is green: run `pnpm vitest run src/App.test.tsx -t "\[A17\]"` and check the summary shows at least one `passed` (not all skipped); the outer loop for this behavior closes only then.
- [x] T036 [A18] Confirm A18 is green: run `pnpm vitest run src/App.test.tsx -t "\[A18\]"` and check the summary shows at least one `passed` (not all skipped); the outer loop for this behavior closes only then.
- [x] T037 [A19] Confirm A19 is green: run `pnpm vitest run src/App.test.tsx -t "\[A19\]"` and check the summary shows at least one `passed` (not all skipped); the outer loop for this behavior closes only then.

**Checkpoint**: `001`'s manual checks 11, 12, 15, 16 and 17 are automated, and `A16` is green.

---

## Phase 3: User Story 1 - Don't lose a half-typed session to a stray click (Priority: P1) 🎯 MVP

**Goal**: Load asks before discarding a session in progress; Cancel or Escape restores it and returns focus to the Load button.

**Independent Test**: Start a text, type a few characters, press Load on another entry, choose Cancel, and confirm the session is unchanged. Repeat and choose to discard: the other text loads.

### Tests for User Story 1 ⚠️

> Write these first and confirm they FAIL before T020-T023

- [x] T016 [P] [US1] [U14] [U15] [U16] [U17] [U18] [U19] [U20] [U21] [U22] [U23] [U24] Write `src/components/ConfirmDiscardDialog.test.tsx` per contracts/ui.md, using `userEvent` from `vitest/browser` for real input: with `open` true it is a modal `dialog` named "Discard your progress on this text?"; "Cancel" has focus when it opens; Cancel calls `onCancel`; Escape calls `onCancel`; "Discard and load" calls `onConfirm`; Tab and Shift+Tab keep focus inside the dialog; with `open` false nothing is shown; an axe check with it open; the screen reader announces the dialog and its question.
- [x] T017 [P] [US1] [U8] [U9] [U10] [U11] [U12] [U13] Extend `src/views/PracticeView.test.tsx` (after T010): `onTypingStarted` is called once on the first correct character; once on a first wrong character; once on composition end; not called when nothing is typed; not called a second time within the same run; called again after a remount (a new run).
- [x] T018 [P] [US1] [U26] Extend `src/views/Sidebar.test.tsx` (after T015): pressing an entry's Load button calls `onLoadRequest(item, trigger)` with `trigger` being that button element.
- [ ] T019 [US1] [A1] [A2] [A3] [A4] [A5] [A6] [A7] [A8] [A14] [A15] Extend `src/App.test.tsx` (after T013) with US1's acceptance scenarios: mid-practice Load on a different entry shows the dialog and changes nothing yet (US1.1); Cancel and Escape each restore the exact session (same text, same typed position) and return focus to the pressed Load button (US1.2, FR-003); confirming loads the entry fresh (US1.3); Load on the running entry prompts too (US1.4); no prompt when nothing is typed or the session is finished (US1.5, FR-004); keyboard-only open, cancel and confirm (US1.6, SC-003); pressing Load repeatedly shows one dialog (edge case); Reset never prompts (FR-006); a cancelled confirmation changes no count or date (FR-010). Update `001`'s tests that load mid-practice (`A6`, `A20`) to go through the dialog; record this as an intended baseline change.

### Implementation for User Story 1

- [x] T020 [P] [US1] [U14] [U15] [U16] [U17] [U18] [U19] [U20] [U21] [U22] [U23] [U24] Create `src/components/ConfirmDiscardDialog.tsx` per contracts/ui.md: a native `<dialog>` opened with `showModal()` when `open` becomes true and closed with `close()` otherwise; `aria-labelledby` pointing at the question "Discard your progress on this text?"; "Cancel" (`autoFocus`) and "Discard and load" using the shared `Button` component; the `cancel` event (Escape) calls `onCancel`. Must not import from `views/` or `features/`.
- [x] T021 [P] [US1] [U8] [U9] [U10] [U11] [U12] [U13] Add `onTypingStarted?: () => void` to `src/views/PracticeView.tsx`: call it on the first input of the run, correct or wrong, including composition end, and never twice per mount. T010's characterization tests must still pass.
- [x] T022 [P] [US1] [U26] Change `src/views/Sidebar.tsx` so `onLoadRequest` is `(item: SavedText, trigger: HTMLElement) => void`, passing the pressed Load button (`event.currentTarget`).
- [ ] T023 [US1] [A1] [A2] [A3] [A4] [A5] [A6] [A7] [A8] [A14] [A15] Wire `src/App.tsx` per contracts/ui.md "App integration": `sessionTouched` state (set by `onTypingStarted`, reset on every start); on Load while `typingState === "running" && sessionTouched`, store `{ item, trigger }` and open `ConfirmDiscardDialog` without writing; on confirm, start the session with `item.text` and clear the pending load; on cancel or Escape, clear it and call `trigger.focus()`; Reset unchanged. Run `pnpm test` until T016-T019 are green.

### Acceptance confirmation for User Story 1

- [x] T038 [US1] [A1] Confirm A1 is green: run `pnpm vitest run src/App.test.tsx -t "\[A1\]"` and check the summary shows at least one `passed` (not all skipped); the outer loop for this behavior closes only then.
- [x] T039 [US1] [A2] Confirm A2 is green: run `pnpm vitest run src/App.test.tsx -t "\[A2\]"` and check the summary shows at least one `passed` (not all skipped); the outer loop for this behavior closes only then.
- [x] T040 [US1] [A3] Confirm A3 is green: run `pnpm vitest run src/App.test.tsx -t "\[A3\]"` and check the summary shows at least one `passed` (not all skipped); the outer loop for this behavior closes only then.
- [ ] T041 [US1] [A4] Confirm A4 is green: run `pnpm vitest run src/App.test.tsx -t "\[A4\]"` and check the summary shows at least one `passed` (not all skipped); the outer loop for this behavior closes only then.
- [ ] T042 [US1] [A5] Confirm A5 is green: run `pnpm vitest run src/App.test.tsx -t "\[A5\]"` and check the summary shows at least one `passed` (not all skipped); the outer loop for this behavior closes only then.
- [ ] T043 [US1] [A6] Confirm A6 is green: run `pnpm vitest run src/App.test.tsx -t "\[A6\]"` and check the summary shows at least one `passed` (not all skipped); the outer loop for this behavior closes only then.
- [ ] T044 [US1] [A7] Confirm A7 is green: run `pnpm vitest run src/App.test.tsx -t "\[A7\]"` and check the summary shows at least one `passed` (not all skipped); the outer loop for this behavior closes only then.
- [ ] T045 [US1] [A8] Confirm A8 is green: run `pnpm vitest run src/App.test.tsx -t "\[A8\]"` and check the summary shows at least one `passed` (not all skipped); the outer loop for this behavior closes only then.
- [ ] T046 [US1] [A14] Confirm A14 is green: run `pnpm vitest run src/App.test.tsx -t "\[A14\]"` and check the summary shows at least one `passed` (not all skipped); the outer loop for this behavior closes only then.
- [ ] T047 [US1] [A15] Confirm A15 is green: run `pnpm vitest run src/App.test.tsx -t "\[A15\]"` and check the summary shows at least one `passed` (not all skipped); the outer loop for this behavior closes only then.

**Checkpoint**: US1 works on its own. A stray Load can no longer discard a session.

---

## Phase 4: User Story 2 - See how often a text was loaded and completed (Priority: P2)

**Goal**: Each entry shows "Loaded: N" and "Completed: N"; loads count on every start or confirmed load.

**Independent Test**: Start a text, reset, load it again, and finish it once. Its entry shows "Loaded: 2" and "Completed: 1".

### Tests for User Story 2 ⚠️

> Write these first and confirm they FAIL before T026-T028

- [ ] T024 [P] [US2] [U38] [U39] [U40] [U41] Extend `src/features/savedItems/history.test.ts` per contracts/history-module.md: `recordPractice` on a new text creates one entry with `numberOfLoads = 1` and `numberOfCompletes = 0`; on an existing text `numberOfLoads` +1 and `numberOfCompletes` unchanged; two concurrent starts of a new text leave one entry with `numberOfLoads = 2`; the two-writer retry path also adds 1. Update any `001` assertion that expects `numberOfLoads` to stay 0, recorded as an intended baseline change.
- [ ] T025 [P] [US2] [U43] [U44] [U45] [U46] [A16] Extend `src/features/savedItems/db.test.ts`: the version 4 upgrade sets `numberOfLoads` to "max(numberOfLoads, numberOfCompletes, 1)" on every row: 0 becomes 1; a value below `numberOfCompletes` is raised to it; a row already at or above both is unchanged. Extend T011's `A16` test to assert the corrected loaded count.
- [ ] T026 [P] [US2] [U34] [U35] [U36] [U37] Extend `src/components/SavedTextItem.test.tsx`: shows "Loaded: {numberOfLoads}" and "Completed: {numberOfCompletes}" and no "Practiced" text; replaces `001`'s `U45`-`U47` ("Practiced N time(s)"), recorded as an intended baseline change; the screen reader reads both counts.
- [ ] T027 [US2] [A9] [A10] [A11] [A12] [A13] Extend `src/App.test.tsx` (after T019) with US2's acceptance scenarios: a new text shows "Loaded: 1" and "Completed: 0" (US2.1); starting again from the setup box and loading from the sidebar each raise "Loaded" by one and leave "Completed" (US2.2); finishing raises "Completed" by one and leaves "Loaded" (US2.3); cancelling the discard confirmation leaves "Loaded" unchanged (US2.4). Update `001`'s tests that assert "Practiced N time(s)" (`A7`, `A10`, `A11`, `A18`) to the new counts.

### Implementation for User Story 2

- [ ] T028 [P] [US2] [U38] [U39] [U40] [U41] Update `recordPractice` in `src/features/savedItems/history.ts`: create with `numberOfLoads: 1`; on an existing entry and on the two-writer retry path, `numberOfLoads + 1` alongside `dateModified = now`. `recordCompletion` unchanged. Update the `numberOfLoads` comment in `src/types.ts` from "legacy, unused" to "loaded count".
- [ ] T029 [P] [US2] [U43] [U44] [U45] [U46] [A16] Add schema version 4 to `openSavedTextsDb` in `src/features/savedItems/db.ts`: stores identical to version 3 (`++id, dateCreated, dateModified, &text`) with an `.upgrade()` that sets each row's `numberOfLoads` to `Math.max(numberOfLoads, numberOfCompletes, 1)`.
- [ ] T030 [P] [US2] [U34] [U35] [U36] [U37] Update `src/components/SavedTextItem.tsx`: replace "Practiced N time(s)" with two lines, "Loaded: {numberOfLoads}" and "Completed: {numberOfCompletes}", in the existing `text-ink-muted` style. Run `pnpm test` until T024-T027 are green.

### Acceptance confirmation for User Story 2

- [ ] T048 [US2] [A9] Confirm A9 is green: run `pnpm vitest run src/App.test.tsx -t "\[A9\]"` and check the summary shows at least one `passed` (not all skipped); the outer loop for this behavior closes only then.
- [ ] T049 [US2] [A10] Confirm A10 is green: run `pnpm vitest run src/App.test.tsx -t "\[A10\]"` and check the summary shows at least one `passed` (not all skipped); the outer loop for this behavior closes only then.
- [ ] T050 [US2] [A11] Confirm A11 is green: run `pnpm vitest run src/App.test.tsx -t "\[A11\]"` and check the summary shows at least one `passed` (not all skipped); the outer loop for this behavior closes only then.
- [ ] T051 [US2] [A12] Confirm A12 is green: run `pnpm vitest run src/App.test.tsx -t "\[A12\]"` and check the summary shows at least one `passed` (not all skipped); the outer loop for this behavior closes only then.
- [ ] T052 [US2] [A13] Confirm A13 is green: run `pnpm vitest run src/App.test.tsx -t "\[A13\]"` and check the summary shows at least one `passed` (not all skipped); the outer loop for this behavior closes only then.
- [ ] T053 [US2] [A16] Confirm A16 is green: run `pnpm vitest run src/App.test.tsx -t "\[A16\]"` and check the summary shows at least one `passed` (not all skipped); the outer loop for this behavior closes only then.

**Checkpoint**: US1 and US2 both work, together and on their own.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T031 [A17] Close out `001`: in `specs/001-practice-history/tasks.md`, tick `T009`, `T012` and `T042` now that `A16` is green (T011), and note in its close-out section that checks 11, 12, 15, 16 and 17 are automated by T011-T015; set `A16` to `DONE` in `specs/001-practice-history/tdd/test-list.md` with the test name.
- [ ] T032 Run `pnpm test`, `pnpm build` and `npx prettier --check .` from the repository root; all must pass.
- [ ] T033 Manual checks from `quickstart.md` (user): the focus ring on the dialog's buttons and the Load buttons is clearly visible; a VoiceOver spot check of the dialog (announced with its question; Escape returns to the Load button).
- [ ] T034 Write the PR description: justify the dev dependency changes (added `@vitest/browser-playwright`, `playwright`, `@guidepup/virtual-screen-reader`; removed `fake-indexeddb` and `jsdom`; `axe-core` from `001`); carry `001`'s missing `T029` notes (why `axe-core` replaced `vitest-axe`, the contrast result, `SetupView` still has no accessibility tests); note the constitution amendment to 1.3.0 and the still-open progress-bar bug (stops one character short of 100%). Open a pull request from `002-history-refinements`; do not push to `main`.

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: T001 → T002 → T003 → T004 → T005 → T006; T007 lands in the same commit as T003-T006; T008 after T005; T009 after T005. Blocks everything else.
- **Foundational (Phase 2)**: after Setup. T010, T011 and T014 in parallel (different files); T012 and T013 follow T011 (same file); T015 follows T014 (same file).
- **US1 (Phase 3)**: after Foundational. T017 needs T010 (characterization first). T020-T022 after their tests; T023 last.
- **US2 (Phase 4)**: after Foundational. Independent of US1 except T027's US2.4 (cancelled confirmation), which needs T023. T025 extends T011's test.
- **Polish (Phase 5)**: after both stories.

### Parallel Opportunities

- T010, T011, T014 (Foundational, three files)
- T016, T017, T018 (US1 tests, three files); T020, T021, T022 (US1 implementation, three files)
- T024, T025, T026 (US2 tests, three files); T028, T029, T030 (US2 implementation, three files)
- `App.test.tsx` is extended by T011, T012, T013, T019 and T027 in that order; never in parallel.

---

## Parallel Example: User Story 1

```bash
Task: "Write ConfirmDiscardDialog.test.tsx in src/components/ConfirmDiscardDialog.test.tsx"
Task: "Extend PracticeView.test.tsx with onTypingStarted in src/views/PracticeView.test.tsx"
Task: "Extend Sidebar.test.tsx with the Load trigger in src/views/Sidebar.test.tsx"
```

---

## Implementation Strategy

### MVP First

1. Phase 1: Setup (browser mode, green, same 109 tests)
2. Phase 2: Foundational (`001`'s carried-over checks)
3. Phase 3: User Story 1 (confirm before discard)
4. **Stop and validate**: `pnpm test`, `pnpm build`, the VoiceOver spot check

### Incremental Delivery

1. Setup + Foundational: real-browser suite, `001` fully closed
2. US1: no more lost sessions
3. US2: loaded and completed counts
4. Polish: close-out, gates, PR

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- Commit after each task or logical group, Conventional Commits (`pnpm commit`)
- Never weaken, skip or delete a test to reach green; `spec.md` decides when a test and the code disagree
- Changes to `001`'s tests (T019, T024, T026, T027) are intended baseline changes and are recorded as such
