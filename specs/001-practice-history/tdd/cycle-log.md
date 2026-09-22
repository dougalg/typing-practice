# Cycle Log: Practice History in the Sidebar

Append only. Newest last. Every entry's `red` block is the evidence that the test
existed and failed before the implementation.

## Baseline

- suite: `pnpm test` -> 2 passed, 0 failed (1 file, `src/components/Heading.test.tsx`)
- commit: `bfb1466`
- recorded: cycle 0, before any change

## Setup: fake-indexeddb and vitest-axe

- Added `fake-indexeddb` and `vitest-axe` as dev dependencies (`pnpm add -D`), regenerated via
  `pnpm install` after an earlier `pnpm format` run corrupted `pnpm-lock.yaml`'s quote style
  (reverted; lockfile must only ever be written by pnpm).
- Verified both against a throwaway `src/test/smoke.test.ts` (removed once verified): Dexie
  add/get round-trips a row through `fake-indexeddb`; `axe()` + `toHaveNoViolations()` passes a
  clean labelled button and, with a deliberate `<img>` with no alt text, reports
  `violations.length > 0` (not vacuous).
- `src/test/setup.ts`: registered `vitest-axe/matchers` via `expect.extend` (the
  `vitest-axe/extend-expect` import alone only adds TypeScript types, not the runtime matcher —
  discovered by a first failing smoke run: `Invalid Chai property: toHaveNoViolations`), added
  `fake-indexeddb/auto`, and an `afterEach` that clears `savedTextsDb.savedTexts` between tests.
- Also added `afterEach(cleanup)` from `@testing-library/react`: this repo runs Vitest without
  globals, so Testing Library's own auto-cleanup (which looks for a global `afterEach`) never
  registers, and a second `render()` in one test file leaves the first render's DOM in place.
  Found via a genuine "multiple elements found" failure while writing the first characterization
  test, not anticipated in advance.
- commit: `eeb3b5f`

## Characterization: App.tsx, Sidebar.tsx, SavedTextItem.tsx, db.ts (tasks T030-T033)

Per the playbook's brownfield section: each test asserts current behavior, was confirmed green
immediately, then verified with a deliberate mutant (break, confirm the characterization test
fails, restore exactly, confirm the full suite is green again with no diff in the production
file). These are not red-green-refactor cycles; states go straight to `BASELINE`.

- U1 (`src/App.test.tsx`): idle app shows the setup box and "Start practice". Mutant: renamed the
  button to "MUTANT-Start practice" in `SetupView.tsx` -> test failed (`Unable to find
  role="button" name "Start practice"`). Restored.
- U2 (`src/App.test.tsx`): starting shows the practice view with the typed text and the typing
  input. Mutant: changed the typing input's placeholder to `"MUTANT"` in `PracticeView.tsx` ->
  failed. Restored.
  - Deviation found while writing this test: the test's own text-matching helper was buggy, not
    the code. `getByText("hello")` can't match split-per-character `<span>`s, and my first
    replacement helper (any `<p>` with that exact textContent) collided with the sidebar's own
    preview of the same text, since the current `App.tsx` already saves every started text to
    `savedTextsDb` on every Start. This surfaced as apparent flakiness (pass/fail depending on
    whether the sidebar's `useLiveQuery` had resolved yet), reproduced 6/10 runs, root-caused by
    isolating the test and reading the actual "multiple elements" error rather than assumed to be
    inherent async flakiness. Fixed by scoping the query to the "Type the text below" `<section>`
    via `within()`. Re-run 6 times clean afterward.
- U3 (`src/App.test.tsx`): Ctrl+Enter starts practice. Mutant: same placeholder mutant as U2 ->
  failed. Restored.
- U4 (`src/App.test.tsx`): Reset returns to the setup view. Mutant: renamed the Reset button to
  "MUTANT-Reset" -> failed. Restored.
- U5 (`src/App.test.tsx`): typing the whole text shows the finished message. Mutant: changed the
  finish message to `"MUTANT"` on the line the "hi" test path actually hits (`PracticeView.tsx`
  line ~100, the `handleTypingInput` branch, not the composition-event branch at line ~195) ->
  failed. Restored.
  - Finding, not fixed (out of this feature's scope, Hard Rule 6): on the last character,
    `handleTypingInput` calls `onFinish()` but never calls `setPosition(nextPos)`, so `position`
    stays one short of `targetText.length` and the progress bar reports `(n-1)/n` instead of
    100% even though typing is complete (observed: "hi", 2 chars, finishes at 50%, not 100%). My
    first draft of U5 assumed 100% and failed against the untouched code for the wrong reason
    (assertion failure, not a broken test) — caught, and the test corrected to assert the actual
    number, with the quirk called out in a comment. Reporting this per Hard Rule 6 rather than
    fixing it; it predates this feature and touches `PracticeView.tsx`, which is out of this
    feature's file scope.
- A4 (`src/App.test.tsx`): empty/whitespace text shows the setup error and adds no entry (already
  true today, tracked as a characterization behavior per `tasks.md`). Mutant: changed the error
  message to `"MUTANT"` in `App.tsx` -> failed. Restored.
- U6 (`src/views/Sidebar.test.tsx`, new file): a stored text appears in the sidebar with a Load
  button. Mutant: changed `.limit(5)` to `.limit(0)` in `Sidebar.tsx` -> `findByText` timed out
  and failed. Restored. Re-run 3 times clean.
- U7 (`src/components/SavedTextItem.test.tsx`, new file): shows its text, Load calls
  `onLoadRequest` once. Mutant: removed the button's `onClick` in `SavedTextItem.tsx` -> failed
  (`onLoadRequest` not called). Restored. Re-run 3 times clean.
- U8 (`src/features/savedItems/db.test.ts`, new file): a row added reads back with every field
  intact, dates still `Date` instances. Mutant: changed the `savedTexts` store definition from
  `"++id, ..."` to `"id, ..."` (no auto-increment) in `db.ts`, so `add()` without an explicit id
  rejects -> failed. Restored. Re-run 3 times clean.

Suite after this phase: `pnpm test` -> 11 passed, 0 failed (5 files). `pnpm build` passes. No
diff remains in any production file (`App.tsx`, `PracticeView.tsx`, `SetupView.tsx`,
`Sidebar.tsx`, `SavedTextItem.tsx`, `db.ts`) — every mutant was restored exactly.

- commit: (recorded after this entry is written, see report)
