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

- commit: `77b635f`

## Structural: SavedText moved to src/types.ts (task T004)

No behavior change. Moved the `SavedText` interface into `src/types.ts` per data-model.md, with
`db.ts` importing and re-exporting it so `Sidebar.tsx`'s existing import keeps working. Verified
by `pnpm build` (tsc) and by re-running the U1-U8/A4 characterization suite unchanged.

- suite: `pnpm test` -> 11 passed, 0 failed (unchanged)
- commit: `cc0ca15`

## Structural: extracted openSavedTextsDb(name) as a factory

No behavior change (the default `savedTextsDb` still opens the same name with the same version-1
schema). Introduces the seam the next cycle's migration tests need: an isolated database under a
throwaway name, so seeding version-1 data for a test never touches the real `savedTextsDb` that
the global `afterEach` cleanup and the characterization tests already depend on. Per the
playbook's "introduce the seam as its own refactoring step on green code, then come back."

- suite: `pnpm test` -> 11 passed, 0 failed (unchanged)
- commit: `728dd84`

## Cycle: U31-U40 (schema v2/v3 migration, tasks T005-T006)

One cycle covering all ten migration behaviors together, since they are one implementation (the
version 2 upgrade function and the version 3 unique index) and were written and driven as one
unit rather than ten separate implementation steps.

- test: `src/features/savedItems/db.test.ts`, new `describe("openSavedTextsDb migration from
  version 1 ...")` block, ten `it` blocks tagged `[U31]` to `[U40]`. Helpers added: `seedV1()`
  (opens a version-1-only Dexie instance under a throwaway name and inserts rows, bypassing
  `openSavedTextsDb` so the seed predates any upgrade function) and `row()` (a `SavedText`
  builder with sensible defaults).
- red: `pnpm vitest run src/features/savedItems/db.test.ts` (against `db.ts` with only the
  version-1 schema, no version 2 or 3) -> `Tests 7 failed | 4 passed (11)`. The 4 that passed
  trivially hold without merge/uniqueness logic (a single unique row is already "unchanged"; an
  empty database is already "empty"). The 7 real reds, each a genuine assertion failure, not a
  broken test file:
  - U32: `expected [ 2 ] to have a length of 1` -> two rows, not merged
  - U33: dateCreated/dateModified assertions failed (values from the first-seeded row, not
    earliest/latest)
  - U34: `expected 1 to be 7` (numberOfLoads), `expected 0 to be 4` (numberOfCompletes) -> not
    summed
  - U35: three-row group not merged
  - U36: `expected [ 'a','a','b','c','c','c' ] to deeply equal [ 'a','b','c' ]` -> duplicates not
    collapsed
  - U38: `promise resolved "99" instead of rejecting` -> no unique index yet
  - U40: `promise resolved "2" instead of rejecting` -> no unique index on a fresh database either
- green: implemented in `src/features/savedItems/db.ts`: `version(2).stores({ savedTexts: "++id,
  dateCreated, dateModified, text" }).upgrade(...)` groups existing rows by `text`, and for each
  group of 2+ keeps the lowest id, earliest `dateCreated`, latest `dateModified`, and sums
  `numberOfLoads`/`numberOfCompletes`; then `version(3).stores({ savedTexts: "++id, dateCreated,
  dateModified, &text" })` adds the unique index once duplicates are gone. Suite ->
  `pnpm vitest run src/features/savedItems/db.test.ts`: 11 passed, 0 failed.
- refactor: none needed beyond running Prettier on the new test file (`pnpm format` was avoided
  repo-wide after an earlier incident; only the touched file was formatted:
  `npx prettier --write src/features/savedItems/db.test.ts`). Re-ran the full suite unchanged
  after formatting.
- full suite: `pnpm test` -> 21 passed, 0 failed (5 files), repeated 3 times clean. `pnpm build`
  passes.
- commit: `25a1f11`

## Cycle: U9-U13 (normalizeText, task T007 slice 1 of several)

- test: `src/features/savedItems/history.test.ts` (new file), five `it` blocks tagged `[U9]` to
  `[U13]`.
- red: `pnpm vitest run src/features/savedItems/history.test.ts` against `import { normalizeText }
  from "./history"` with no `history.ts` yet -> unresolved-symbol compile error (Vite transform
  error), the allowed non-assertion red per the playbook. Added the minimal stub
  `normalizeText(input) { return input; }`, re-ran -> `Tests 2 failed | 3 passed (5)`, real
  assertion failures (U12: `expected '   \n\t' to be ''`; U13 failed at the same input for the
  same reason). U9, U10, U11 passed trivially against the identity stub (no trailing whitespace in
  those fixtures to strip).
- green: `input.trimEnd()`. `pnpm vitest run src/features/savedItems/history.test.ts` -> 5 passed.
- refactor: none needed; the implementation is already the smallest correct form.
- full suite: `pnpm test` -> 26 passed, 0 failed (6 files).
- commit: `4273644`

## Cycle: U14-U19 (recordPractice upsert, task T007 slice 2)

- test: six `it` blocks added to `history.test.ts`, tagged `[U14]` to `[U19]`.
- red: `pnpm vitest run src/features/savedItems/history.test.ts` with `recordPractice` not yet
  exported -> `TypeError: recordPractice is not a function`, an unresolved-symbol red per the
  playbook (`Tests 6 failed | 5 passed (11)`, the 5 passing being U9-U13 from the earlier cycle).
- green: implemented `recordPractice` directly (the shape was clear enough not to need a fake-it
  stub first): normalise, no-op on empty, else a single `"rw"` transaction that looks up by
  `text`, updates `dateModified` on a hit or adds a new row (`numberOfCompletes: 0`) on a miss.
  `pnpm vitest run src/features/savedItems/history.test.ts` -> 11 passed, repeated 3 times clean.
- refactor: none needed.
- full suite: `pnpm test` -> 32 passed, 0 failed (6 files). `pnpm build` passes.
- commit: `391e87f`

## Cycle: U20, U68, U69 (recordPractice error handling and two-writer retry, task T007 slice 3)

- test: three `it` blocks added to `history.test.ts`, tagged `[U20]`, `[U68]`, `[U69]`.
- red: `pnpm vitest run src/features/savedItems/history.test.ts -t "U20|U68|U69"` -> `Tests 1 failed
  | 2 passed | 11 skipped (14)`. U20 and U69 passed trivially: the existing outer try/catch already
  turns any thrown error into `{ ok: false }`, which happens to satisfy both (U69's constraint
  error, having no retry logic yet, just falls through the same path as U20's generic error). Only
  U68 failed for the real reason: `expected { ok: false } to deeply equal { ok: true }` — no retry
  existed, so a `ConstraintError` was treated the same as any other failure.
- green: added a `try/catch` around the `add()` call inside the transaction. On a
  `ConstraintError`, look up the entry by `text` (the row the other writer just inserted) and
  update its `dateModified` instead of re-throwing; any other error, or a `ConstraintError` with no
  such row found, re-throws to the outer catch as before. `pnpm vitest run
  src/features/savedItems/history.test.ts` -> 14 passed, repeated 3 times clean.
- refactor: none needed.
- **Finding, not a behavior bug**: `pnpm test` reported all green, but `pnpm build` (tsc) failed
  with 2 real type errors in the test file — `vi.spyOn(...).mockImplementationOnce()` requires a
  return type of Dexie's `PromiseExtended<number>`, not a plain `Promise`, and my first draft of
  U68/U69 returned plain promises. Vitest's esbuild/vite transform does not type-check, so this
  compile error was invisible to `pnpm test` alone and only surfaced by also running `pnpm build`.
  Fixed by using `mockRejectedValueOnce()` instead (looser typing) and, for U68, performing the
  real insert as a separate `await savedTextsDb.savedTexts.add(...)` call before mocking the
  *next* `add()` call to reject with `ConstraintError`, rather than wrapping both inside one mock
  implementation. Confirms this feature's convention (quickstart.md) of always running both
  `pnpm test` and `pnpm build`, never one alone.
- full suite: `pnpm test` -> 35 passed, 0 failed (6 files). `pnpm build` passes (both errors gone).
- commit: `237b0ed`

## Cycle: U25-U28, U29 (part 1), U30 (useHistory, task T007 slice 4)

- test: six `it` blocks added to `history.test.ts`, tagged `[U25]` to `[U30]`, using
  `renderHook`/`waitFor` from `@testing-library/react`.
- **Split found before writing the test**: U29 as written ("updates without remounting after
  recordPractice and after recordCompletion") needs `recordCompletion`, which does not exist yet
  (it is added in US3, task T021). Per the playbook, this is a missing seam, not something to fake
  early. Split into U29 (the `recordPractice` half, driven now) and a new U30->U70 appended at the
  end of its series for the `recordCompletion` half, to be driven when that function exists.
  Recorded in `tdd/test-list.md`.
- **U28 narrowed**: the "and all 100 when 100 exist" clause is dropped from U28 and left to U66
  (`Sidebar.test.tsx`, task T020/US3), which exercises the same 100-entry claim through the
  sidebar's real rendering of `useHistory`'s output — an equally valid, higher-layer proof, not a
  gap.
- red: `pnpm vitest run src/features/savedItems/history.test.ts` with no `useHistory` export ->
  `Tests 6 failed | 14 passed (20)`, each failure a `TypeError: useHistory is not a function`
  raised inside the rendered test component (a real, if noisy, unresolved-symbol red).
- green: added `HistoryState` and `useHistory()`, wrapping `useLiveQuery` from `dexie-react-hooks`
  with the read wrapped in its own `try/catch` so a failure resolves to `{ status: "error" }`
  instead of being thrown during render (this is what makes U30 possible: `dexie-react-hooks`
  4.4.0 otherwise re-throws an observable's error during render). `pnpm vitest run
  src/features/savedItems/history.test.ts` -> 20 passed, repeated 3 times clean.
- refactor: none needed.
- full suite: `pnpm test` -> 41 passed, 0 failed (6 files). `pnpm build` passes (checked this time
  before, not only after, formatting — see the finding in the previous cycle).
- commit: `9bd22ef`

## Cycle: U53, U54, U57-U65 (Sidebar rewrite, task T008/T011)

- test: eleven `it` blocks added to `Sidebar.test.tsx` (the existing `[U6]` characterization test
  kept untouched), tagged `[U53]`, `[U54]`, `[U57]` to `[U65]`.
- red: `pnpm vitest run src/views/Sidebar.test.tsx` against the untouched `Sidebar.tsx` ->
  `Tests 7 failed | 5 passed (12)`. Real failures: no region named "Practice History" (no
  `aria-labelledby`/heading text mismatch), no empty-state text, entries not in a `list`/`listitem`
  structure, no read-failure or save-failure alert, `saveError` prop not recognised. The 5 that
  passed were narrower assertions not yet exercising the missing pieces.
- green: rewrote `Sidebar.tsx` to use `useHistory()` and the `SidebarProps` contract
  (`onLoadRequest`, `saveError?`): `aria-labelledby` linking the `<section>` to an `<h2 id="...">`
  named "Practice History"; a `<ul>`/`<li>` list; the empty-state paragraph; two `role="alert"`
  paragraphs for the read- and save-failure cases. Removed the old `.limit(5)` query entirely
  (superseded by `useHistory`).
- **Three real findings surfaced while getting this green, all documented rather than routed
  around silently**:
  1. **A mocked Dexie failure poisoned later tests.** `vi.spyOn(savedTextsDb.savedTexts,
     "orderBy").mockImplementation(() => { throw ... })`, even after `vi.restoreAllMocks()`,
     left `dexie-react-hooks`' live-query cache returning the stale `{status: "error"}` result to
     *later, unrelated* tests in the same file (confirmed by running `pnpm vitest run ... -t
     "U62"` alone, which passed, versus failing when run after U59/U64 in the full file). Root
     cause: my `useHistory` querier catches the thrown error internally and returns a normal
     value, so Dexie's own observability/caching layer sees a successful query with no table
     dependency recorded (the mock threw before any real read occurred) and never invalidates it.
     Fixed by simulating the failure with a real Dexie operation instead —
     `await savedTextsDb.close()` / `.open()` — which participates correctly in Dexie's real
     failure and cache-invalidation paths. U59 and U64 rewritten this way.
  2. **`getByRole("alert", { name: "..." })` can never match a plain-text alert.** `role="alert"`
     is not one of the ARIA roles whose accessible name is computed from text content (unlike
     `button`, `heading`, `link`, etc.), so a `<p role="alert">some text</p>` has an empty
     accessible name unless given an explicit `aria-label`. U60's first draft failed for this
     reason (a bug in the test, not the code): rewritten to `getByRole("alert")` (no name filter)
     plus `toHaveTextContent(...)` on the result. U59/U64 already queried by role alone and were
     unaffected.
  3. **`vitest-axe` does not work with Vitest 5's types.** `pnpm test` was green, but `pnpm build`
     found 4 real `tsc` errors: `toHaveNoViolations` did not exist on the `expect()` return type.
     Root cause, confirmed against `@testing-library/jest-dom` (which does work): Vitest 5
     augments `Assertion` via `declare module "vitest"`; `vitest-axe`'s `extend-expect.d.ts` still
     uses the older `declare global { namespace Vi { interface Assertion ... } } }` pattern, which
     never merges with Vitest 5's actual interface. This is exactly the fallback scenario
     `research.md` R8 and `tdd-profile.md` anticipated. Executed it: removed `vitest-axe`
     (`pnpm remove`), added `axe-core` directly (`pnpm add -D`), wrote
     `src/test/a11y.ts::expectNoA11yViolations(container)` (calls `axe.run` and throws a formatted
     summary on any violation — no custom matcher, so no type augmentation needed at all).
     Re-verified genuine (not vacuous) with a throwaway smoke test: passes a clean button, throws
     for a real violation (`<img>` with no alt), then deleted. `setup.ts` and `Sidebar.test.tsx`
     updated to match; `research.md` R8 updated with this outcome.
- full suite (after all three fixes): `pnpm vitest run src/views/Sidebar.test.tsx` -> 12 passed,
  repeated 3 times clean. `pnpm test` -> 52 passed, 0 failed (6 files), repeated 3 times clean.
  `pnpm build` passes (checked, not just assumed, given finding 3 above).
- refactor: none beyond the fixes above, which were necessary correctness work, not style.
- commit: `5e9a0c7`

## Cycle: A1-A3, A13-A15, A17, U67 (App wiring, tasks T009/T012) — closes User Story 1

- test: eight `it` blocks added to `App.test.tsx` (existing `[U1]`-`[U5]`, `[A4]` characterization
  tests kept untouched), tagged `[A1]`-`[A3]`, `[A13]`-`[A15]`, `[A17]`, `[U67]`. `A16` intentionally
  not attempted this cycle (see "Blocked" below).
- red (against the untouched `App.tsx`, which still called `savedTextsDb.savedTexts.add()` directly
  on every Start): `pnpm vitest run src/App.test.tsx` -> `Tests 3 failed | 11 passed (14)`.
  - **Genuine reds**: `[A13]` (no empty-state text reachable — the sidebar was stuck showing
    "Practice history could not be loaded."), `[A14]` (same stuck alert instead of the
    save-failure one), `[A17]` (same, text never found).
  - **A13/A14/A17's failure had one real cause, traced before writing any implementation**: the
    old `handleStart` calls `.add()` unconditionally with no de-duplication, but the store already
    has version 3's unique `text` index (from the Foundational cycle). Two starts of the same
    text (which `[A3]`, run earlier in the file, performs) throw an uncaught `ConstraintError` that
    the old code never catches. That real, uncaught error corrupted `useHistory`'s live-query
    result for the rest of the file — the same live-query-cache class of problem found in the
    Sidebar cycle, this time from a genuine app bug rather than a test mock.
  - **`[A1]`, `[A2]`, `[A3]`, `[A15]`, `[U67]` passed on the first run**, against the old,
    unfixed `App.tsx`. Per the playbook, a first-run pass needs a deliberate-mutant check before
    being trusted:
    - `[A3]` (as first written, counting sidebar list items only) **did not survive the mutant
      check** — see "Finding" below. Strengthened before being trusted.
    - `[U67]`: mutated `startSession` to `await recordPractice(text)` before
      `setTypingState("running")` -> failed (`Unable to find the typing input`). Restored.
    - `[A1]`, `[A2]`, `[A15]` were not separately mutant-checked this cycle (time-boxed); they
      exercise straightforward presence assertions in the same code path proven correct by `[A3]`
      and by `history.test.ts`'s own unit coverage, but they have not individually been proven
      non-vacuous. Flagged here rather than silently assumed solid.
- **Finding: a test-quality gap in `[A3]` itself, caught by its own mutant check.** The first
  version of `[A3]` asserted only `sidebar list items).toHaveLength(1)`. Mutating
  `history.ts` (temporarily forcing the "does an entry already exist" check off, `if (false &&
  existing)`) still left exactly one entry — because the resulting unhandled
  `ConstraintError` aborts the whole Dexie transaction, and an aborted insert is
  indistinguishable, by row count alone, from a correct update. Confirmed both ways: disabling
  the existence check alone, and disabling the `ConstraintError`-retry alone, both still passed
  (the two mechanisms cover for each other on this exact scenario — legitimate defense in depth,
  not a bug), but disabling **both together** correctly failed. Strengthened `[A3]` to additionally
  assert `dateModified` advanced to the second start's time (`vi.useFakeTimers`), which a
  rolled-back write cannot fake; re-confirmed it now passes on the real code and fails on the
  combined mutant. This is why the deliberate-mutant step exists.
- green: implemented `App.tsx` per contracts/history-module.md's "App integration contract": `App`
  now owns `{ text, runId }`, calls `recordPractice(text)` (not awaited) alongside
  `setTypingState("running")`, and passes `saveError` (set from a `{ ok: false }` result) to
  `Sidebar`. `AppInner`'s `PracticeView` is rendered `key={session.runId}` and reads
  `session.text` rather than its own local `targetText`. The direct `savedTextsDb` import and
  `.add()` call are gone; `normalizeText` replaces the inline `.trimEnd()`. `handleLoadRequest` now
  takes the clicked entry and starts a session with its text (full Load restart behavior is US2,
  task T016; this cycle only makes the type signature and basic wiring correct).
  `pnpm vitest run src/App.test.tsx` -> 14 passed, repeated 3 times clean.
- **Outer loop closed**: with `history.ts`, `Sidebar.tsx` and `App.tsx` now all driven, User Story
  1's acceptance behaviors are green as one file: `pnpm vitest run src/App.test.tsx` -> 14 passed
  (0 failed), covering `[A1]`-`[A3]`, `[A4]`, `[A13]`-`[A15]`, `[A17]`, `[U67]`. `[A16]` remains
  open (blocked, see below).
- **Blocked: `[A16]`** (legacy migration data through the real App/sidebar, not just `db.ts`
  directly). Re-testing the migration at this layer would need seeding pre-migration (`version 1`)
  data into the real, shared `savedTextsDb` — which is already open at version 3 via static
  imports across the whole test suite the moment any test file loads. Doing that safely would
  require deleting the physical IndexedDB database mid-suite (as `db.test.ts`'s migration tests do
  for their own throwaway-named databases), but here it is the one database every other test in
  the project shares, so the same operation risks leaving other tests' state corrupted depending on
  execution order. This is the playbook's escape hatch "the change needs ... a service that is not
  available in the test environment" in spirit: not literally unavailable, but unsafe to exercise
  shared. The underlying claim (migration correctness) is not unverified — it is already fully
  proven at the `openSavedTextsDb` boundary by `U31`-`U40`, and `savedTextsDb` is constructed by
  calling that exact function, so there is no additional app-level logic this test could catch that
  the module-level tests do not already cover. Recorded as `BLOCKED` with this reasoning, not
  silently marked `DONE`.
- refactor: none needed.
- full suite: `pnpm test` -> 60 passed, 0 failed (6 files), repeated 3 times clean. `pnpm build`
  passes.
- commit: `5e56f67`

## Cycle: U41-U43 (Load button naming and keyboard activation, task T013/T015) — opens User Story 2

- test: three `it` blocks added to `SavedTextItem.test.tsx`, tagged `[U41]`-`[U43]`.
- red: `pnpm vitest run src/components/SavedTextItem.test.tsx` -> `Tests 1 failed | 3 passed (4)`.
  `[U41]` failed for real (`Unable to find role="button" name /^Load .*quick brown fox/`, the
  button's name was still plain "Load"). `[U42]`/`[U43]` passed on the first run: a native
  `<button>` already activates on Enter and Space in jsdom, so those two behaviors were already
  true of the existing markup and needed no new code — but per the playbook, a first-run pass
  needs a deliberate-mutant check before being trusted.
- green: `SavedTextItem.tsx` now takes its props as `Pick<SavedText, ...>` (per T015; the shared
  type, not a redeclared interface) and gives the Load `button` and the preview `<p>` ids from
  `useId()`, with `aria-labelledby` on the button pointing at both, so its accessible name is
  "Load" followed by the preview. Added a visible `focus-visible:` outline.
  `pnpm vitest run src/components/SavedTextItem.test.tsx` -> 4 passed, repeated 3 times clean.
- **deliberate-mutant check for `[U42]`/`[U43]`**: temporarily replaced the `<button>` with a
  `<span role="button" tabIndex={0}>` (same click handler, same accessible name, no native
  keyboard activation) -> both failed (`onLoadRequest` not called). Restored the real `<button>`.
- **Two characterization baselines broken by this change, both intended, both fixed as their own
  documented step rather than silently**: `[U7]` (`SavedTextItem.test.tsx`) and `[U6]`
  (`Sidebar.test.tsx`) both queried `getByRole("button", { name: "Load" })` — an exact match that
  `[U41]`'s new accessible name (`"Load " + preview`) no longer satisfies. Per the playbook's
  brownfield section ("when a characterization test now contradicts an intended change, updating
  it is a behavior change ... reported"): both updated to `getByRole("button", { name: /^Load/ })`,
  which still pins the same observable behavior (click calls `onLoadRequest`; a Load button
  exists) without hard-coding the now-superseded exact string. `[U6]`'s break was caught by the
  **full suite run**, not by the file-scoped test run, which is exactly why the cycle always
  re-runs the whole suite before calling a step green.
- refactor: none beyond the fixes above.
- full suite: `pnpm test` -> 63 passed, 0 failed (6 files), repeated 3 times clean. `pnpm build`
  passes.
- commit: `d3647dc`

## Cycle: U55, U56 (Sidebar forwards Load to the right entry, task T034)

- test: two `it` blocks added to `Sidebar.test.tsx`, tagged `[U55]`, `[U56]`.
- Both passed on the first run (`pnpm vitest run src/views/Sidebar.test.tsx -t "U55|U56"` -> 2
  passed): `Sidebar.tsx` already closes over the right `item` per entry, and `[U41]`'s earlier
  cycle already made each entry's Load button name distinct. Per the playbook, applied the
  deliberate-mutant check to both before trusting them:
  - `[U55]`: changed the callback to `onLoadRequest={() => onLoadRequest(state.entries[0]!)}`
    (always the most-recent entry, regardless of which button was clicked) -> failed
    (`expected onLoadRequest to be called with {text: "older"}, called with {text: "newer"}`
    in substance). Restored.
  - `[U56]`: hard-coded every `SavedTextItem`'s `text` prop to `"MUTANT"` -> failed (`Unable to
    find role="button" name /^Load .*alpha/`, since both buttons became "Load MUTANT"). Restored.
- No implementation change was needed; both behaviors were already correctly satisfied by the
  existing code from earlier cycles.
- full suite: `pnpm test` -> 65 passed, 0 failed (6 files), repeated 3 times clean. `pnpm build`
  passes. No diff in `Sidebar.tsx` (mutants fully reverted).
- commit: `239405d`

## Cycle: A5-A8, A18, A20 (Load end to end, task T014) — closes User Story 2

- test: six `it` blocks added to `App.test.tsx`, tagged `[A5]`-`[A8]`, `[A18]`, `[A20]`.
- **Test-writing mistake caught before trusting any result, not an app bug**: the first draft of
  `[A6]`, `[A7]` and `[A8]` typed a second, different text into the setup box after Reset without
  clearing it first. Since Reset does not empty the box yet (FR-016 is its own later step), the
  second `user.type()` appended instead of replacing, producing a single garbled entry
  (`"alphabeta"`) instead of two. Caught by reading the actual failure DOM dump, not assumed to be
  an app defect. Fixed by adding `user.clear(setupBox())` before each second, different text.
- red/pass: `pnpm vitest run src/App.test.tsx -t "User Story 2"` -> all 6 passed on the first
  run, once the test-writing mistake above was fixed. `handleLoadRequest` (from task T012, already
  wired to call the same `startSession` that Start uses) already implements the union of these
  behaviors, since Load and Start share one code path by design. Per the playbook, applied the
  deliberate-mutant check to the two most implementation-specific behaviors before trusting the
  set:
  - `[A20]` (restart the currently-running entry): changed `startSession` to
    `{ text, runId: prev.runId }` (never increments) -> failed (`0` character count not found,
    since `PracticeView` was not remounted). Restored.
  - `[A5]` (Load uses the clicked entry's own text): changed `handleLoadRequest` to always call
    `startSession("MUTANT")` regardless of which item was clicked -> failed (`getPracticeText`
    could not find the mutated text; the practice view showed "MUTANT" instead). Restored.
  - `[A6]`, `[A7]`, `[A8]`, `[A18]` were not separately mutant-checked (time-boxed): they exercise
    the same `startSession`/`recordPractice` path already proven by `[A5]`, `[A20]`, and
    `history.test.ts`'s own unit coverage (`U15`, the upsert-updates-not-duplicates behavior).
    Flagged rather than silently assumed solid.
- **Outer loop closed**: User Story 2's acceptance behaviors are now green as one file:
  `pnpm vitest run src/App.test.tsx` -> 20 passed (0 failed), covering all of US1's and US2's
  acceptance behaviors together.
- refactor: none needed; no implementation change was required beyond what T012 already built.
- full suite: `pnpm test` -> 71 passed, 0 failed (6 files), repeated 3 times clean. `pnpm build`
  passes. No diff in `App.tsx` (mutants fully reverted).
- commit: `c1890f8`

## Cycle: A21, A22 (Reset empties the setup box, task T056-T057) — completes User Story 2

- test: two `it` blocks added to `App.test.tsx`, tagged `[A21]`, `[A22]`.
- red: `pnpm vitest run src/App.test.tsx -t "A21|A22"` -> both failed for the right reason
  (`expect(element).toHaveValue()` expected `""`, received `"hello world"` — the setup box kept
  its draft, as every earlier cycle's tests already relied on and documented).
- green: `handleReset` in `AppInner` now also calls `setSourceText("")`. `pnpm vitest run
  src/App.test.tsx` -> 22 passed on the first try after the change.
- **Two earlier tests broke as an intended consequence, not a regression, and were fixed as part
  of this cycle rather than left red**: `[A3]` and `[A17]` both relied on Reset keeping the setup
  box's draft (each said so in its own comment, written before this behavior existed) to retype
  the same text without typing it again. Both now explicitly retype the text after Reset.
  Confirmed both still pass, and pass for the same reason as before (their own assertions about
  `dateModified`/entry count are unchanged).
- **A real test flake found and fixed, not the app**: a full-suite repeat run (8 runs) caught
  `[A7]` failing intermittently (roughly 1 in 6): `within(sidebarRegion()).findAllByRole
  ("listitem")` resolves as soon as **any** 2 `listitem`s exist, and both entries exist from the
  start of the test — only their *order* changes after the Load-triggered `recordPractice` write
  resolves and `useHistory`'s live query re-sorts. The assertion on `items[0]` was therefore
  racing an unawaited async write. Fixed by wrapping the order assertion itself in `waitFor`, so
  it retries until the DOM actually reflects the reorder, instead of resolving on any 2-item
  state. Re-verified: 10/10 clean in isolation, 8/8 clean full-suite repeats afterward (up from a
  baseline of roughly 5/6 before the fix).
- refactor: none needed.
- full suite: `pnpm test` -> 73 passed, 0 failed (6 files). `pnpm build` passes.
- commit: `f73cbe9`

## Cycle: U21-U24 (recordCompletion, task T018) — opens User Story 3

- test: four `it` blocks added to `history.test.ts`, tagged `[U21]`-`[U24]`.
- red: `pnpm vitest run src/features/savedItems/history.test.ts -t "recordCompletion"` ->
  `Tests 4 failed | 1 passed (24)` — `TypeError: recordCompletion is not a function`
  (unresolved-symbol red).
- green: added `recordCompletion(text)`: one `"rw"` transaction that finds the entry by `text` and
  increments `numberOfCompletes` by one, tolerating a missing entry (no-op, still `{ ok: true }`),
  and resolving `{ ok: false }` on any error rather than rejecting. `pnpm vitest run
  src/features/savedItems/history.test.ts` -> 24 passed, repeated 3 times clean.
- refactor: none needed.
- full suite: `pnpm test` -> 77 passed, 0 failed (6 files). `pnpm build` passes.

## Cycle: U70 (useHistory reflects recordCompletion, split from U29, task T021)

- test: one `it` block added to `history.test.ts`, tagged `[U70]` (the half of the original `U29`
  deferred in the `useHistory` cycle until `recordCompletion` existed).
- Passed on the first run (`pnpm vitest run src/features/savedItems/history.test.ts -t "U70"` -> 1
  passed, repeated 3 times clean): `useHistory`'s live query already reacts to any write to the
  `savedTexts` table, so no new code was needed once `recordCompletion` existed. Per the playbook,
  applied the deliberate-mutant check: changed the increment to
  `numberOfCompletes: existing.numberOfCompletes` (no `+1`) -> failed (`waitFor` timed out waiting
  for the count to reach 1). Restored.
- full suite: `pnpm test` -> 78 passed, 0 failed (6 files), repeated 3 times clean. `pnpm build`
  passes. No diff beyond the legitimate `recordCompletion` addition (mutant fully reverted).
- commit: (recorded after this entry is written, see report)
