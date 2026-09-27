# Cycle Log: Practice History Refinements

Append only. Newest last. Every entry's `red` block is the evidence that the test existed and failed
before the implementation.

## Baseline

- suite: `pnpm test` -> 109 passed, 0 failed (8 files), 4.52 s, jsdom environment
- commit: `4823aa2`
- recorded: cycle 0, before any change (and before the browser-mode migration, tasks T001-T009)

## Preflight: move the suite to Vitest browser mode (tasks T001-T007)

Not a TDD cycle: no behavior changes, and the same 109 tests (same names) must stay green. The tasks
carry no behavior markers, so they were ticked here as the loop's preflight, not by a cycle.

- T001 baseline re-run: `pnpm test` under jsdom -> 109 passed, 0 failed (8 files), Duration 4.32 s
  (4.99 s wall), at `942e6ea`. Matches the baseline above.
- T002 dependencies: `pnpm add -D @vitest/browser-playwright@5.0.2 playwright
@guidepup/virtual-screen-reader` -> @vitest/browser-playwright 5.0.2, playwright 1.63.0,
  @guidepup/virtual-screen-reader 0.33.0; `pnpm exec playwright install chromium` exited 0 (already
  cached). **Deviation from the task text (5.0.1):** this branch has `vitest ^5.0.2` installed, and
  `@vitest/browser-playwright@5.0.1` declares an exact peer `vitest: 5.0.1` and depends on
  `@vitest/browser@5.0.1`, i.e. a mixed-version runner. 5.0.2 is the release matching the runner;
  the user confirmed it. (The install itself was first refused by the agent's permission classifier
  and was run after the user granted it.)
- T003 `vite.config.ts`: `environment: "jsdom"` replaced by `test.browser: { enabled: true, provider:
playwright(), headless: true, screenshotFailures: false, instances: [{ browser: "chromium" }] }`.
  Option names checked against the installed types (`BrowserConfigOptions` in vitest 5.0.2's
  `plugin.d.*.d.ts`; `playwright(options?)` exported by `@vitest/browser-playwright`).
  `screenshotFailures: false` is an addition: without it every red writes a screenshot into
  `__screenshots__/` beside the test.
- T004 `src/test/setup.ts`: `fake-indexeddb/auto` import removed; the `cleanup()` and table-clear
  `afterEach` hooks kept, with a comment that the clear is now load-bearing (real IndexedDB, one origin).
- T005 first browser-mode run: `pnpm test` -> `Tests 2 failed | 107 passed (109)`. Both in
  `src/App.test.tsx`:
  - `[A14] when saving to the store fails, ...` and `[U67] the practice view is shown immediately ...`
    -> `TypeError: Cannot redefine property: recordPractice` at `vi.spyOn(historyModule,
"recordPractice")`. In the browser, ES module namespaces are real and not configurable.
    Fix (mechanics only): `vi.mock("./features/savedItems/history", { spy: true })` at the top of
    the file, which wraps each export in a spy around its real implementation; the tests' own
    `vi.spyOn(...).mockResolvedValueOnce(...)` lines are unchanged. Checked the spy is live with a
    deliberate mutant: A14's mocked result changed from `ok: false` to `ok: true` ->
    `pnpm vitest run src/App.test.tsx -t "\[A14\]"` -> `TestingLibraryElementError: Unable to find
role="alert"` (1 failed | 29 skipped); restored.
  - `src/features/savedItems/db.test.ts`: `migrationDbName()` now deletes the database before handing
    out the name (and is async; its 10 call sites `await` it). Not an observed failure in a single
    run (Playwright starts a fresh browser profile per run), but a real-browser difference: in watch
    mode the same browser reruns the file, the counter restarts, and seeding a version-1 schema over
    last run's upgraded database under the same name would fail. Preventive; no assertion changed.
  - Not changed, and passing in the browser: `src/features/savedItems/history.test.ts`'s
    method-level mocks from the fake-indexeddb era (`[U20]`, `[U24]`, `[U68]`, `[U69]` mock
    `add`/`update`; `[U30]` mocks `orderBy` to throw). They spy on object methods, not module
    namespaces, so they still work. `[U30]` is the pattern that poisoned `dexie-react-hooks`' cache
    in 001; watched across the three runs below with no flake.
  - After the fixes: `pnpm test` x3 -> 109 passed, 0 failed (8 files) each time; Duration 5.69 s,
    5.76 s, 6.09 s (jsdom: 4.32 s re-run, 4.52 s baseline). `pnpm build` passes. No test names
    changed.
- T006 `pnpm remove fake-indexeddb jsdom` -> removed; `pnpm test` -> 109 passed (5.77 s);
  `pnpm build` passes.
- T007 constitution 1.2.0 -> 1.3.0 (approved by the user 2026-09-27): Technology & Tooling now names
  Vitest browser mode (Playwright, Chromium); Principle V's jsdom contrast sentence now says contrast
  is checked by axe in the real browser; Sync Impact Report and Last Amended updated. Only the two
  approved edits; other jsdom-era wording (Principle III's "Where no browser runner exists", the
  `vitest-axe` examples) left as is and reported.
- commit: the migration commit that contains this entry (`test(setup): run the suite in vitest
browser mode`); its SHA is recorded in the next entry.

## Preflight: screen-reader helper and TDD profile (tasks T008, T009)

Not a TDD cycle (test infrastructure only). Ticked as preflight.

- Migration commit from the previous entry: `fa1e8fc`.
- T009 `src/test/screenReader.ts`: `spokenPhrases(container)` starts a fresh `Virtual` from `@guidepup/virtual-screen-reader` 0.33.0 on the container, steps `next()` to the end, and returns `spokenPhraseLog()`. Found while proving it: with a container other than `document.body` the reader never says "end of document" and wraps back to the first item (first attempt returned 2001 phrases: `expected [ 'button, Save draft', 'S', …(1999) ] to deeply equal []`). The helper now stops when it is back on the first item's node with the first item's phrase. Proved under browser mode with a throwaway test file, then deleted as the task says:
  - a labelled button: `["button, Save draft", "S", "end of button, Save draft"]` (passed);
  - two list items with the same paragraph text, read once and in order, observed through a deliberately failing assertion: `list | listitem, level 1, position 1, set size 2 | paragraph | same | end of paragraph | end of listitem, level 1, position 1, set size 2 | listitem, level 1, position 2, set size 2 | paragraph | same | end of paragraph | end of listitem, level 1, position 2, set size 2 | end of list`.
- The first run of that throwaway failed as a suite with "Vite unexpectedly reloaded a test" (new dependency optimised mid-run). Fix: `optimizeDeps.include: ["@guidepup/virtual-screen-reader"]` in `vite.config.ts`. Then `node_modules/.vite` removed and `pnpm test` run cold -> 109 passed, 5.92 s, no reload.
- T008 `.specify/memory/tdd-profile.md` refreshed (`/speckit-tdd-setup refresh`, detected at `fa1e8fc`). Verified by running: `pnpm test` -> 109 passed (5.7-6.1 s); `pnpm vitest run src/App.test.tsx -t "\[A14\]"` -> `1 passed | 29 skipped (30)`; `pnpm vitest run src/App.test.tsx -t "no such test xyz"` -> `30 skipped (30)`, exit 0; `pnpm vitest run src/components/Heading.test.tsx` -> `2 passed (2)`, exit 0. Changes from the jsdom profile: runner is browser mode; `acceptance` is now `src/App.test.tsx` through the same runner (was null); exemplars are `SavedTextItem.test.tsx` (unit) and `App.test.tsx` (acceptance) instead of `Heading.test.tsx` alone; helpers add `a11y.ts` and `screenReader.ts`; notes rewritten (IndexedDB, module spying, `tsc` gate, cold-cache reload, areas with no tests). Coverage, mutation and property tools are still absent.

## Cycle 1: U1 while running, PracticeView shows the target text and a focused typing input (characterization)

- test: `src/views/PracticeView.test.tsx::[U1] while running, shows the target text and a focused typing input` (new file)
- first run: `pnpm vitest run src/views/PracticeView.test.tsx -t "\[U1\]"` -> `1 passed (1)`, as expected for a characterization test against the untouched view
- mutant: removed `setTimeout(() => typingInputRef.current?.focus(), 0)` from the run-start effect -> same command -> `Error: expect(element).toHaveFocus()` (1 failed); restored exactly (working tree shows `PracticeView.tsx` unchanged)
- suite: `pnpm test` x3 -> 110 passed each (6.02 s, 6.12 s, 6.08 s); `pnpm build` passes
- refactor: none needed
- state: BASELINE

## Cycle 2: U2 a correct character moves the position on by one (characterization)

- test: `src/views/PracticeView.test.tsx::[U2] a correct character moves the position on by one` (new)
- first run: `pnpm vitest run src/views/PracticeView.test.tsx -t "\[U2\]"` -> `1 passed | 1 skipped (2)`, as expected
- mutant: `setPosition(nextPos)` -> `setPosition(position)` (both the input and composition branches) -> same command -> `Expected element to have text content: 1 / 5 Received: 0 / 5` (1 failed); restored exactly
- suite: `pnpm test` x3 -> 111 passed each (6.34 s, 6.01 s, 5.99 s); `pnpm build` passes
- refactor: none needed (added a `charactersTyped()` query helper for the "Characters" statistic)
- commit: previous cycle's commit was `be2e8f0`
- state: BASELINE

## Cycle 3: U3 a wrong character shows the error message and does not move the position (characterization)

- test: `src/views/PracticeView.test.tsx::[U3] a wrong character shows the error message and does not move the position` (new)
- first run: `pnpm vitest run src/views/PracticeView.test.tsx -t "\[U3\]"` -> `1 passed | 2 skipped (3)`, as expected
- mutant: `actual === expected || (...)` -> `true || (...)` (every character accepted) -> same command -> `TestingLibraryElementError: Unable to find an accessible element with the role "alert"` (1 failed); restored exactly
- suite: `pnpm test` x3 -> 112 passed each (6.26 s, 6.15 s, 6.03 s); `pnpm build` passes
- refactor: none needed
- commit: previous cycle's commit was `ce4333c`
- state: BASELINE

## Cycle 4: U4 typing the whole text calls onFinish once (characterization)

- test: `src/views/PracticeView.test.tsx::[U4] typing the whole text calls onFinish once` (new)
- first run: `pnpm vitest run src/views/PracticeView.test.tsx -t "\[U4\]"` -> `1 passed | 3 skipped (4)`, as expected
- mutant: removed the `onFinish()` call in the input handler's last-character branch -> same command -> `AssertionError: expected "vi.fn()" to be called once, but got 0 times` (1 failed); restored exactly
- suite: `pnpm test` x3 -> 113 passed each (6.04 s, 6.07 s, 6.08 s); `pnpm build` passes
- refactor: none needed
- commit: previous cycle's commit was `e8b36a1`
- state: BASELINE

## Cycle 5: U5 pressing Reset calls onReset (characterization)

- test: `src/views/PracticeView.test.tsx::[U5] pressing Reset calls onReset` (new)
- first run: `pnpm vitest run src/views/PracticeView.test.tsx -t "\[U5\]"` -> `1 passed | 4 skipped (5)`, as expected
- mutant: Reset's `onClick={onReset}` -> `onClick={() => {}}` -> same command -> `AssertionError: expected "vi.fn()" to be called once, but got 0 times` (1 failed); restored exactly
- suite: `pnpm test` x3 -> 114 passed each (6.18 s, 5.90 s, 6.03 s); `pnpm build` passes
- refactor: none needed
- commit: previous cycle's commit was `95f6014`
- state: BASELINE
