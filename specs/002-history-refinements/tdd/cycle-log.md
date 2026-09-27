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

## Cycle 6: U6 the running view has no axe violations (characterization)

- test: `src/views/PracticeView.test.tsx::[U6] the running view has no axe violations` (new; uses `expectNoA11yViolations` from `src/test/a11y.ts`)
- first run: `pnpm vitest run src/views/PracticeView.test.tsx -t "\[U6\]"` -> `1 passed | 5 skipped (6)`, as expected (in the real browser this includes axe's computed colour-contrast rule)
- mutant: removed the progress bar's `aria-label="Progress"` -> same command -> `Expected no accessibility violations, found 1: - aria-progressbar-name: ARIA progressbar nodes must have an accessible name (1 node(s))` (1 failed); restored exactly
- suite: `pnpm test` x3 -> 115 passed each (6.81 s, 6.36 s, 6.10 s); `pnpm build` passes
- refactor: none needed
- commit: previous cycle's commit was `b661c11`
- state: BASELINE

## Structural: load the app stylesheet in every test (found while characterizing U7)

- finding: while mutant-checking U7, a low-contrast mutant (finished message `text-success` -> `text-success-soft`, the same colour as its background) **survived**: `pnpm vitest run src/views/PracticeView.test.tsx -t "\[U7\]"` -> `1 passed | 6 skipped (7)`. Cause: `src/style.css` (Tailwind and the colour tokens) is imported only by `main.tsx` and `App.tsx`, so a component rendered on its own in a test had no styles at all, and axe's `color-contrast` rule measured browser defaults. This also corrects cycle 6's note: U6's pass did **not** include a real-palette contrast check (its mutant was a missing name, which is unaffected).
- change: `src/test/setup.ts` imports `../style.css`. No test changed. The U7 test was set aside (not committed) while this step ran.
- suite: `pnpm test` x3 -> 115 passed each (6.43 s, 6.03 s, 6.07 s); `pnpm build` passes. Every existing axe check (Sidebar, SavedTextItem, PracticeView) now runs against the real palette and passes.
- commit: previous cycle's commit was `5a9405a`

## Cycle 7: U7 the finished view has no axe violations (characterization)

- test: `src/views/PracticeView.test.tsx::[U7] the finished view has no axe violations` (new). Types the text to the end, then re-renders with `typingState="finished"` as `App` does, so the success message and colours are on screen.
- first run: `pnpm vitest run src/views/PracticeView.test.tsx -t "\[U7\]"` -> `1 passed | 6 skipped (7)`, as expected
- mutant 1 (before the stylesheet step above): finished message `text-success` -> `text-success-soft` -> **survived** (`1 passed`); led to the structural commit `9370130`.
- mutant 1 again, with styles: still passed. A throwaway debug test (deleted) showed the styles now apply (`color` and `background` both `rgb(227, 245, 225)`) and that axe files an exact 1:1 ratio under `incomplete` ("Element has a 1:1 contrast ratio with the background"), not as a violation, because identical colours can be deliberately hidden text.
- mutant 2: finished message `text-success` -> `text-[#9ccf97]` (light green on light green) -> same command -> `Expected no accessibility violations, found 1: - color-contrast: Elements must meet minimum color contrast ratio thresholds (1 node(s))` (1 failed); restored exactly
- suite: `pnpm test` x3 -> 116 passed each (6.29 s, 6.03 s, 5.94 s); `pnpm build` passes
- refactor: none needed
- commit: previous commit was `9370130`
- state: BASELINE. T010 (U1-U7) is complete but stays unticked: the skill never ticks a task whose behaviors are `BASELINE`.

## Cycle 8: A17 data from before 001, with duplicate rows of one text, shows one entry per text through the real app

- test: `src/App.test.tsx::App (specs/002-history-refinements, checks carried over from 001) > [A17] data from before 001, with duplicate rows of one text, shows one entry per text` (new; new helper `seedVersion1Database()` closes `savedTextsDb`, deletes it, seeds a raw version-1 Dexie instance, closes it and reopens `savedTextsDb`, which runs every upgrade)
- **filter note:** 001's tests in the same file already use `[A1]`-`[A22]`, so the task's `-t "\[A17\]"` matches two tests (`2 passed | 29 skipped (31)`: 001's A17 and this one) and could pass on 001's test alone. 002's acceptance tests therefore sit in describe blocks named `App (specs/002-history-refinements, ...)`, and every 002 acceptance run uses the qualified filter `-t "002-history-refinements.*\[A17\]"` -> `1 passed | 30 skipped (31)`. The confirm tasks T035-T053 are run with that form.
- first run: `pnpm vitest run src/App.test.tsx -t "002-history-refinements.*\[A17\]"` -> `1 passed | 30 skipped (31)`. Expected: 001 already built the upgrade; this is the check 001 could not automate under fake-indexeddb.
- mutant: version 2's upgrade `if (group.length < 2) continue;` -> `continue;` (duplicates never merged) -> same command -> `AbortError: ConstraintError Unable to add key to index 'text': at least one key does not satisfy the uniqueness requirements.` (1 failed); restored exactly
- suite: `pnpm test` x3 -> 117 passed each (5.98 s, 6.11 s, 5.86 s); `pnpm build` passes
- refactor: none needed
- commit: previous commit was `a28332c`
- state: DONE. Ticked T011 and T035 (confirmed with the qualified filter).

## Cycle 9: A18 with IndexedDB unusable from the start, practice can still be started and the sidebar shows an alert

- test: `src/App.test.tsx::App (specs/002-history-refinements, checks carried over from 001) > [A18] with IndexedDB unusable from the start, ...` (new)
- approach (research.md R9, adjusted): `Dexie.dependencies.indexedDB` is read when a `Dexie` instance is constructed, so stubbing it cannot affect the already-built `savedTextsDb`. Instead the test closes `savedTextsDb` with `{ disableAutoOpen: false }` (Dexie 4's plain `close()` disables auto-open, which is what 001's `close()` tests rely on) and spies on `indexedDB.open` to throw `InvalidStateError`, as a browser with storage blocked does. The app's first query then opens the database afresh and that open fails. The spy is restored and `savedTextsDb` reopened in `finally`.
- first run: `pnpm vitest run src/App.test.tsx -t "002-history-refinements.*\[A18\]"` -> `1 passed | 31 skipped (32)`. Expected: 001 built the failure handling; this automates its manual check.
- mechanics check: spy left calling through (no throw) -> same command -> `TestingLibraryElementError: Unable to find role="alert"` (1 failed): the stub, not the close, is what makes storage unusable.
- product mutant: `useHistory`'s `catch` returns `{ status: "ready", entries: [] }` instead of `{ status: "error" }` -> same command -> `TestingLibraryElementError: Unable to find role="alert"` (1 failed); restored exactly
- suite: `pnpm test` x3 -> 118 passed each (5.89 s, 6.41 s, 5.95 s), no unhandled errors; `pnpm build` passes
- refactor: none needed
- commit: previous commit was `dfec71f`
- state: DONE. Ticked T012 and T036 (qualified filter).

## Cycle 10: A19 at a 320 CSS px viewport, the page does not scroll sideways and every Load button is fully visible (guard)

- test: `src/App.test.tsx::App (specs/002-history-refinements, checks carried over from 001) > [A19] at a 320 CSS px viewport with entries listed, ...` (new). Seeds two entries (one a 320-character unbroken text), sets `page.viewport(320, 800)` from `vitest/browser`, renders `App`, asserts `clientWidth` is 320, `scrollWidth <= clientWidth`, and each Load button's box lies within `[0, clientWidth]`; restores the default 414 x 896 viewport in `finally`.
- first run: `pnpm vitest run src/App.test.tsx -t "002-history-refinements.*\[A19\]"` -> `1 passed | 32 skipped (33)`. Expected: `main`'s single-column layout already reflows; this is a guard (research.md R8).
- mutant 1 (from the task): each entry's root gets `w-[400px]` -> same command -> `AssertionError: expected 424 to be less than or equal to 320` (1 failed); restored exactly
- mutant 2 (extra): removed `[overflow-wrap:anywhere]` from the entry preview -> **survived**. Equivalent for this behavior: the preview also has `line-clamp-3` (overflow hidden) inside a `min-w-0` box, so the long word is clipped rather than widening the page. Not a gap in the reflow guard; noted only.
- suite: `pnpm test` x3 -> 119 passed each (6.22 s, 5.90 s, 5.86 s); `pnpm build` passes
- refactor: none needed
- commit: previous commit was `bdf86f0`
- state: DONE. Ticked T013 and T037 (qualified filter).

## Cycle 11: U27 a populated sidebar passes axe's colour-contrast rule in the real browser, and fails it on a low-contrast mutant (covered by an existing test)

- test: none new. Already covered by 001's `src/views/Sidebar.test.tsx::[U63] the populated sidebar has no axe violations`, which runs the full axe rule set, `color-contrast` included, and since the structural commit `9370130` does so against the real palette (before it, the sidebar rendered unstyled and contrast was measured on browser defaults). Adding a second test with the same render and the same assertion would be a duplicate.
- verification: `pnpm vitest run src/views/Sidebar.test.tsx -t "\[U63\]"` -> `1 passed | 16 skipped (17)`.
- mutant 1: entry metadata `text-ink-muted` -> `text-[#eeeeee]` -> **survived**. A throwaway debug test (deleted) showed why: the entry background (`bg-surface-sunken`) is itself `#eeeeee`, and axe files an exact 1:1 ratio under `incomplete` ("Element has a 1:1 contrast ratio with the background"), not `violations`. Recorded as a known limit of axe: text coloured exactly like its background is not reported.
- mutant 2: entry metadata `text-ink-muted` -> `text-[#bbbbbb]` -> same command -> `Expected no accessibility violations, found 1: - color-contrast: Elements must meet minimum color contrast ratio thresholds (2 node(s))` (1 failed); restored exactly
- suite: unchanged since cycle 10 (119 passed x3); no code or test changed in this cycle
- commit: previous commit was `e3a60c9`
- state: DONE (test: U63). Ticked T014: its contrast check exists and is proven to compute colours, although no new test was added.

## Cycle 12: U28 a screen reader announces the region as "Practice History" (guard)

- test: `src/views/Sidebar.test.tsx::[U28] a screen reader announces the region as Practice History` (new; first use of `spokenPhrases` from `src/test/screenReader.ts`)
- first run: `pnpm vitest run src/views/Sidebar.test.tsx -t "\[U28\]"` -> `1 passed | 17 skipped (18)`. Expected: 001 built the named region; this automates its manual screen-reader check.
- mutant: the panel's `aria-labelledby={HEADING_ID}` -> `aria-labelledby="mutant-missing-id"` -> same command -> `AssertionError: expected 'heading, Practice History, level 2' to be 'region, Practice History'` (1 failed); restored exactly
- suite: `pnpm test` x3 -> 120 passed each (5.96 s, 5.94 s, 6.12 s); `pnpm build` passes
- refactor: none needed
- commit: previous commit was `54bc87b`
- state: DONE

## Cycle 13: U29 a screen reader reads the entries newest first (guard)

- test: `src/views/Sidebar.test.tsx::[U29] a screen reader reads the entries newest first` (new)
- first run: `pnpm vitest run src/views/Sidebar.test.tsx -t "\[U29\]"` -> `1 passed | 18 skipped (19)`. Expected: 001 built the ordering.
- mutant: removed `.reverse()` from `useHistory`'s query -> same command -> `AssertionError: expected [ 'older', 'newer' ] to deeply equal [ 'newer', 'older' ]` (1 failed); restored exactly
- suite: `pnpm test` x3 -> 121 passed each (5.94 s, 6.09 s, 5.93 s); `pnpm build` passes
- refactor: none needed
- commit: previous commit was `e996544`
- state: DONE

## Cycle 14: U30 a screen reader announces each Load button as "Load" plus that entry's text (guard)

- test: `src/views/Sidebar.test.tsx::[U30] a screen reader announces each Load button as Load plus that entry's text` (new)
- first run: `pnpm vitest run src/views/Sidebar.test.tsx -t "\[U30\]"` -> `1 passed | 19 skipped (20)`. Expected: 001 built the button names.
- mutant: the Load button's `aria-labelledby={`${loadId} ${previewId}`}` -> `aria-labelledby={loadId}` -> same command -> `AssertionError: expected [ 'button, Load', 'button, Load' ] to deeply equal [ 'button, Load alpha', …(1) ]` (1 failed); restored exactly
- suite: `pnpm test` x3 -> 122 passed each (6.40 s, 5.96 s, 6.03 s); `pnpm build` passes
- refactor: none needed
- commit: previous commit was `dbf475d`
- state: DONE

## Cycle 15: U31 a screen reader reads the empty-state message (guard)

- test: `src/views/Sidebar.test.tsx::[U31] a screen reader reads the empty-state message` (new)
- first run: `pnpm vitest run src/views/Sidebar.test.tsx -t "\[U31\]"` -> `1 passed | 20 skipped (21)`. Expected.
- mutant: `aria-hidden="true"` on the empty-state paragraph (still in the DOM, so `findByText` still finds it) -> same command -> `AssertionError: expected [ 'region, Practice History', …(2) ] to include 'No practice history yet. Texts you pr…'` (1 failed); restored exactly
- suite: `pnpm test` x3 -> 123 passed each (5.93 s, 6.03 s, 6.18 s); `pnpm build` passes
- refactor: none needed
- commit: previous commit was `a2650b6`
- state: DONE

## Cycle 16: U32 a screen reader announces the read-failure alert (guard)

- test: `src/views/Sidebar.test.tsx::[U32] a screen reader announces the read-failure alert` (new). Real failure path, as in 001's `[U59]`: `savedTextsDb.close()`, reopened in `finally`.
- test mechanics: the reader's phrasing for an alert was not known, so the first draft asserted a deliberately wrong empty string to print the log: `region, Practice History | heading, Practice History, level 2 | alert | Practice history could not be loaded. | end of alert | end of region, Practice History`. The assertion was then written as "`alert` followed by the message". That draft run is a broken-test run, not red evidence.
- first run of the real assertion: `pnpm vitest run src/views/Sidebar.test.tsx -t "\[U32\]"` -> `1 passed | 21 skipped (22)`. Expected: 001 built the alert.
- mutant 1: removed `role="alert"` -> same command -> `TestingLibraryElementError: Unable to find role="alert"` (1 failed, in the test's wait, not the screen-reader assertion)
- mutant 2 (sharper): kept `role="alert"`, wrapped its message in `<span aria-hidden="true">` -> same command -> `AssertionError: expected [ 'alert', …(1) ] to deeply equal [ 'alert', …(1) ]` (1 failed); restored exactly
- suite: `pnpm test` x3 -> 124 passed each (5.98 s, 7.26 s, 6.34 s), no unhandled errors; `pnpm build` passes
- refactor: none needed
- commit: previous commit was `ed60c18`
- state: DONE

## Cycle 17: U33 a screen reader announces the save-failure alert (guard)

- test: `src/views/Sidebar.test.tsx::[U33] a screen reader announces the save-failure alert` (new)
- first run: `pnpm vitest run src/views/Sidebar.test.tsx -t "\[U33\]"` -> `1 passed | 22 skipped (23)`. Expected.
- mutant: kept `role="alert"`, wrapped the save-failure message in `<span aria-hidden="true">` -> same command -> `AssertionError: expected [ 'alert', 'paragraph' ] to deeply equal [ 'alert', …(1) ]` (1 failed); restored exactly
- suite: `pnpm test` x3 -> 125 passed each (6.24 s, 6.49 s, 6.39 s); `pnpm build` passes
- refactor: none needed. (U32 and U33 repeat a two-line "find `alert`, take the next phrase" step; left inline, two uses.)
- commit: previous commit was `cee8923`
- state: DONE. Ticked T015 (U28-U33 all DONE).

## US1 ordering note

The outer loop is opened per acceptance behavior after its units, not before: this loop commits only at green, and an acceptance test left red while several unit cycles are committed would put reds in those commits. Each `A` behavior below still gets its own red (against the missing `App` wiring) before its implementation.

## Cycle 18: U14 with open true, ConfirmDiscardDialog shows a modal dialog named by its question

- test: `src/components/ConfirmDiscardDialog.test.tsx::[U14] with open true, shows a modal dialog named by its question` (new file). Modality is observed as `dialog.matches(":modal")`, true only for a dialog opened with `showModal()`.
- stub: `ConfirmDiscardDialog.tsx` created returning `null` so the import resolves
- red: `pnpm vitest run src/components/ConfirmDiscardDialog.test.tsx -t "\[U14\]"` -> `TestingLibraryElementError: Unable to find an accessible element with the role "dialog" and name "Discard your progress on this text?"` (1 failed)
- green: native `<dialog aria-labelledby={questionId}>` holding the question, `showModal()` in an effect when `open` is true. `pnpm vitest run ... -t "\[U14\]"` -> `1 passed (1)`. Suite `pnpm test` x3 -> 126 passed each (6.36 s, 6.19 s, 6.71 s); `pnpm build` passes
- refactor: none needed
- commit: previous commit was `58bbf98`
- state: DONE

## Cycle 19: U15 when the dialog opens, Cancel has focus

- test: `src/components/ConfirmDiscardDialog.test.tsx::[U15] when it opens, Cancel has focus` (new)
- red: `pnpm vitest run src/components/ConfirmDiscardDialog.test.tsx -t "\[U15\]"` -> `TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Cancel"` (1 failed)
- green: a "Cancel" `Button` (shared component) with `autoFocus`, first focusable in the dialog. Same command -> `1 passed | 1 skipped (2)`. Suite `pnpm test` x3 -> 127 passed each (5.99 s, 6.03 s, 6.71 s); `pnpm build` passes
- refactor: none needed
- commit: previous commit was `bb6542d`
- state: DONE

## Cycle 20: U16 pressing Cancel calls onCancel once and not onConfirm

- test: `src/components/ConfirmDiscardDialog.test.tsx::[U16] pressing Cancel calls onCancel once and not onConfirm` (new; first use of `userEvent` from `vitest/browser`, real input through Playwright)
- red: `pnpm vitest run src/components/ConfirmDiscardDialog.test.tsx -t "\[U16\]"` -> `AssertionError: expected "vi.fn()" to be called once, but got 0 times` (1 failed)
- green: Cancel's `onClick={onCancel}`. Same command -> `1 passed | 2 skipped (3)`. Suite `pnpm test` x3 -> 128 passed each (5.94 s, 5.85 s, 6.08 s); `pnpm build` passes (the `vitest/browser` import type-checks)
- refactor: none needed
- commit: previous commit was `0feba37`
- state: DONE

## Cycle 21: U17 pressing Escape calls onCancel once

- test: `src/components/ConfirmDiscardDialog.test.tsx::[U17] pressing Escape calls onCancel once` (new; real `Escape` via `vitest/browser`'s `userEvent.keyboard`)
- red: `pnpm vitest run src/components/ConfirmDiscardDialog.test.tsx -t "\[U17\]"` -> `AssertionError: expected "vi.fn()" to be called once, but got 0 times` (1 failed)
- green: the `<dialog>`'s native `cancel` event calls `onCancel`. Same command -> `1 passed | 3 skipped (4)`. Suite `pnpm test` x3 -> 129 passed each (6.11 s, 5.99 s, 5.95 s); `pnpm build` passes
- refactor: none needed
- commit: previous commit was `c02cac7`
- state: DONE

## Cycle 22: U18 pressing "Discard and load" calls onConfirm once and not onCancel

- test: `src/components/ConfirmDiscardDialog.test.tsx::[U18] pressing Discard and load calls onConfirm once and not onCancel` (new)
- red: `pnpm vitest run src/components/ConfirmDiscardDialog.test.tsx -t "\[U18\]"` -> `TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Discard and load"` (1 failed)
- green: a "Discard and load" `Button` after Cancel, `onClick={onConfirm}`. Same command -> `1 passed | 4 skipped (5)`. Suite `pnpm test` x3 -> 130 passed each (6.05 s, 6.01 s, 6.01 s); `pnpm build` passes
- refactor: none needed
- commit: previous commit was `a46ec54`
- state: DONE

## Cycle 23: U19 Tab from the last button keeps focus inside the dialog

- test: `src/components/ConfirmDiscardDialog.test.tsx::[U19] Tab from the last button keeps focus inside the dialog` (new; an "Outside" button is rendered too; real Tab via `vitest/browser`)
- red: `pnpm vitest run src/components/ConfirmDiscardDialog.test.tsx -t "\[U19\]"` -> `Error: expect(element).toContainElement(element) ... <dialog aria-labelledby="_r_0_" open="" /> does not contain: <body />` (1 failed). Finding: research.md R6 expected `showModal()` alone to contain focus. In Chromium it makes the page inert (the "Outside" button is skipped) but lets Tab leave the document from the last button (to browser UI, or here the runner's parent frame), leaving `document.activeElement` as `<body>`. FR-005 asks for focus kept inside, so this is a real missing behavior, not a test artefact.
- green: `onKeyDown` on the dialog: Tab (without Shift) on "Discard and load" is prevented and moves focus to "Cancel". Same command -> `1 passed | 5 skipped (6)`. Suite `pnpm test` x3 -> 131 passed each (6.13 s, 6.02 s, 5.96 s); `pnpm build` passes
- refactor: none needed; component comment updated to say what the browser does and does not do
- commit: previous commit was `0a3090f`
- state: DONE

## Cycle 24: U20 Shift+Tab from the first button keeps focus inside the dialog

- test: `src/components/ConfirmDiscardDialog.test.tsx::[U20] Shift+Tab from the first button keeps focus inside the dialog` (new)
- red: `pnpm vitest run src/components/ConfirmDiscardDialog.test.tsx -t "\[U20\]"` -> `Error: expect(element).toContainElement(element) ... does not contain: <body />` (1 failed)
- green: the key handler also moves Shift+Tab on "Cancel" to "Discard and load". Same command -> `1 passed | 6 skipped (7)`. Suite `pnpm test` x3 -> 132 passed each (6.28 s, 6.26 s, 6.28 s); `pnpm build` passes
- refactor: component doc comment updated to name both wraps (comment only)
- commit: previous commit was `de75403`
- state: DONE

## Cycle 25: U21 with open false, no dialog is shown (first-run pass)

- test: `src/components/ConfirmDiscardDialog.test.tsx::[U21] with open false, no dialog is shown` (new)
- first run: `pnpm vitest run src/components/ConfirmDiscardDialog.test.tsx -t "\[U21\]"` -> `1 passed | 7 skipped (8)`. Passed on first run: U14's green already opens the dialog only when `open` is true, and a closed `<dialog>` is not rendered to the accessibility tree.
- mutant: the effect's `open &&` guard removed (always `showModal()`) -> same command -> `Error: expect(element).not.toBeInTheDocument() expected document not to contain element, found <dialog` (1 failed); restored exactly
- suite: `pnpm test` x3 -> 133 passed each (6.37 s, 6.44 s, 6.31 s); `pnpm build` passes
- refactor: none needed
- commit: previous commit was `f0a4366`
- state: DONE

## Cycle 26: U22 changing open from true to false closes it

- test: `src/components/ConfirmDiscardDialog.test.tsx::[U22] changing open from true to false closes it` (new)
- red: `pnpm vitest run src/components/ConfirmDiscardDialog.test.tsx -t "\[U22\]"` -> `Error: expect(element).not.toBeInTheDocument() expected document not to contain element, found <dialog` (1 failed)
- green: the effect calls `dialog.close()` when `open` is false and the dialog is open. Same command -> `1 passed | 8 skipped (9)`. Suite `pnpm test` x3 -> 134 passed each (6.34 s, 7.05 s, 6.57 s); `pnpm build` passes
- refactor: none needed
- commit: previous commit was `c06b9f5`
- state: DONE

## Cycle 27: U23 the open dialog has no axe violations (first-run pass)

- test: `src/components/ConfirmDiscardDialog.test.tsx::[U23] the open dialog has no axe violations` (new)
- first run: `pnpm vitest run src/components/ConfirmDiscardDialog.test.tsx -t "\[U23\]"` -> `1 passed | 9 skipped (10)`. Passed on first run: the dialog built for U14-U22 has no violations.
- mutant 1: removed `aria-labelledby` -> **survived**. Axe lists `aria-dialog-name` as inapplicable to a native `<dialog>` without an explicit role; the name is pinned by U14 instead.
- mutant 2: question paragraph `text-[#cccccc]` -> **survived**. A throwaway debug test (deleted) showed axe files that paragraph under `incomplete`: "Element's background color could not be determined because it's partially obscured by another element" (the unstyled dialog). Revisited in the styling step that follows.
- mutant 3: Cancel button `style={{ color: "#cccccc" }}` -> same command -> `Expected no accessibility violations, found 1: - color-contrast: Elements must meet minimum color contrast ratio thresholds (1 node(s))` (1 failed); restored exactly
- suite: `pnpm test` x3 -> 135 passed each (6.27 s, 6.24 s, 6.59 s); `pnpm build` passes
- refactor: none in this commit; the dialog's visual styling is its own commit next
- commit: previous commit was `50805e5`
- state: DONE

## Styling: ConfirmDiscardDialog looks like the app's panels (no behavior change)

- change: `src/components/ConfirmDiscardDialog.tsx` gets the panel look (`border-line bg-surface text-ink`, 4 px border, hard drop shadow, `max-w-md`, centred), a dimmed backdrop, the question in the pixel font, and the two buttons in a right-aligned row: Cancel first as `primary` (the safe default, which has focus), "Discard and load" as `secondary`. No test changed.
- suite: `pnpm test` x3 -> 135 passed each (6.67 s, 6.34 s, 6.40 s); `pnpm build` passes
- follow-up on cycle 27's surviving mutant 2: with the real styling, the question paragraph is no longer `incomplete` for axe. Question `text-[#cccccc]` -> `pnpm vitest run src/components/ConfirmDiscardDialog.test.tsx -t "\[U23\]"` -> `Expected no accessibility violations, found 1: - color-contrast: ... (1 node(s))` (1 failed); restored exactly
- commit: previous commit was `d95815e`

## Cycle 28: U24 a screen reader announces it as a dialog with its question (first-run pass)

- test: `src/components/ConfirmDiscardDialog.test.tsx::[U24] a screen reader announces it as a dialog with its question` (new)
- test mechanics: a first draft asserted a deliberately wrong empty string to print the reader's phrasing: `dialog, Discard your progress on this text? | dialog, Discard your progress on this text? | paragraph | Discard your progress on this text? | end of paragraph | button, Cancel | button, Discard and load | end of dialog, Discard your progress on this text?`. The assertion is `phrases[0] === "dialog, Discard your progress on this text?"`. The draft run is not red evidence.
- first run of the real assertion: `pnpm vitest run src/components/ConfirmDiscardDialog.test.tsx -t "\[U24\]"` -> `1 passed | 10 skipped (11)`. Passed: U14 already names the dialog.
- mutant: `aria-labelledby={questionId}` removed -> same command -> `AssertionError: expected 'dialog' to be 'dialog, Discard your progress on this…'` (1 failed); restored from the committed file
- suite: `pnpm test` x3 -> 136 passed each (6.30 s, 6.18 s, 6.59 s); `pnpm build` passes
- refactor: none needed
- note: the restore after the mutant first used a copy saved before Prettier reformatted the file at commit time; `git status` showed the difference (line wrapping only), and the file was restored from `HEAD` instead. Mutant restores now use the committed file.
- commit: previous commit was `12e1853`
- state: DONE. Ticked T016 and T020 (U14-U24 all DONE).

## Cycle 29: U8 onTypingStarted is called once when the first character typed is correct

- test: `src/views/PracticeView.test.tsx::[U8] onTypingStarted is called once when the first character typed is correct` (new describe block for `onTypingStarted`)
- red: `pnpm vitest run src/views/PracticeView.test.tsx -t "\[U8\]"` -> `AssertionError: expected "vi.fn()" to be called once, but got 0 times` (1 failed)
- green: optional `onTypingStarted?: () => void` prop, called in the input handler's correct-character branch (fake-it step: it is called on every correct character until U12 forces "once per run"). Same command -> `1 passed | 7 skipped (8)`. Suite `pnpm test` x3 -> 137 passed each (6.47 s, 6.53 s, 6.62 s); `pnpm build` passes. U1-U7 (characterization) still pass.
- refactor: none needed
- commit: previous commit was `3bdbf5e`
- state: DONE

## Cycle 30: U9 onTypingStarted is called once when the first character typed is wrong

- test: `src/views/PracticeView.test.tsx::[U9] onTypingStarted is called once when the first character typed is wrong` (new)
- red: `pnpm vitest run src/views/PracticeView.test.tsx -t "\[U9\]"` -> `AssertionError: expected "vi.fn()" to be called once, but got 0 times` (1 failed)
- green: the call moved from the correct-character branch to the top of the "a character was added" branch, before the right/wrong check. Same command -> `1 passed | 8 skipped (9)`. Suite `pnpm test` x3 -> 138 passed each (6.37 s, 6.25 s, 6.64 s); `pnpm build` passes
- refactor: none needed
- commit: previous commit was `bebfeee`
- state: DONE

## Cycle 31: U10 onTypingStarted is called when the first input arrives through composition end

- test: `src/views/PracticeView.test.tsx::[U10] onTypingStarted is called when the first input arrives through composition end` (new). Playwright cannot drive a real IME, so the test dispatches `compositionstart`, sets the committed text (`ด`) on the input, and dispatches `compositionend` with Testing Library's `fireEvent`, the same sequence `PracticeView`'s handlers read.
- red: `pnpm vitest run src/views/PracticeView.test.tsx -t "\[U10\]"` -> `AssertionError: expected "vi.fn()" to be called once, but got 0 times` (1 failed)
- green: `handleCompositionEnd` calls `onTypingStarted?.()` when the composed text is non-empty. Same command -> `1 passed | 9 skipped (10)`. Suite `pnpm test` x3 -> 139 passed each (6.35 s, 6.28 s, 6.39 s); `pnpm build` passes
- refactor: none needed
- commit: previous commit was `4bc9d47`
- state: DONE

## Cycle 32: U11 onTypingStarted is not called when nothing has been typed (first-run pass)

- test: `src/views/PracticeView.test.tsx::[U11] onTypingStarted is not called when nothing has been typed` (new; waits until the input has focus, i.e. the run-start effect has run, before asserting)
- first run: `pnpm vitest run src/views/PracticeView.test.tsx -t "\[U11\]"` -> `1 passed | 10 skipped (11)`. Passed: U8-U10 call it only from input handlers.
- mutant: `onTypingStarted?.()` added to the run-start effect -> same command -> `AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times` (1 failed); restored from the committed file
- suite: `pnpm test` x3 -> 140 passed each (6.59 s, 6.24 s, 6.19 s); `pnpm build` passes
- refactor: none needed
- commit: previous commit was `e36d24d`
- state: DONE

## Cycle 33: U12 onTypingStarted is not called a second time within the same run

- test: `src/views/PracticeView.test.tsx::[U12] onTypingStarted is not called a second time within the same run` (new; types "hex": two correct, one wrong)
- red: `pnpm vitest run src/views/PracticeView.test.tsx -t "\[U12\]"` -> `AssertionError: expected "vi.fn()" to be called once, but got 3 times` (1 failed)
- green: a `typingStartedRef` flag and a `reportTypingStarted()` function that calls `onTypingStarted` only the first time; both call sites (input and composition end) use it. Same command -> `1 passed | 11 skipped (12)`. Suite `pnpm test` x3 -> 141 passed each (6.36 s, 6.58 s, 6.32 s); `pnpm build` passes
- refactor: none beyond the shared function introduced by the green step
- commit: previous commit was `165bcaa`
- state: DONE

## Cycle 34: U13 after a remount (a new run), the first character calls onTypingStarted again (first-run pass)

- test: `src/views/PracticeView.test.tsx::[U13] after a remount (a new run), the first character calls onTypingStarted again` (new; re-renders with a new `key`, as `App` does per run)
- first run: `pnpm vitest run src/views/PracticeView.test.tsx -t "\[U13\]"` -> `1 passed | 12 skipped (13)`. Passed: U12's flag is a `useRef`, which starts fresh on each mount.
- mutant: the flag moved to a module-level object shared by every mount -> same command -> `AssertionError: expected "vi.fn()" to be called 2 times, but got 1 times` (1 failed); restored from the committed file
- suite: `pnpm test` x3 -> 142 passed each (6.40 s, 6.34 s, 6.47 s); `pnpm build` passes
- refactor: none needed
- commit: previous commit was `0b4d731`
- state: DONE. Ticked T017 and T021 (U8-U13 all DONE).

## Cycle 35: U26 pressing an entry's Load button calls onLoadRequest with that entry and that button element

- test: `src/views/Sidebar.test.tsx::[U26] pressing an entry's Load button calls onLoadRequest with that entry and that button element` (new)
- red: `pnpm vitest run src/views/Sidebar.test.tsx -t "\[U26\]"` -> `AssertionError: expected "vi.fn()" to be called once with arguments: [ …(2) ]` (1 failed)
- **baseline change to a 001 test, before the implementation:** `src/views/Sidebar.test.tsx::[U55] pressing Load on one entry calls onLoadRequest with exactly that entry` asserted `toHaveBeenCalledWith(objectContaining({ text: "older" }))`, i.e. exactly one argument. contracts/ui.md changes the callback to `(item, trigger)`, so that exact-arguments check encodes the old signature. It now checks `toHaveBeenCalledOnce()` (unchanged) and that the first argument is that entry (`mock.calls[0][0]`); the trigger argument is U26's to assert. Not in the test list's planning notes' list of intended baseline changes; reported. Ran green on the old code before the implementation changed: `-t "\[U55\]"` -> `1 passed | 23 skipped (24)`.
- green: `SidebarProps.onLoadRequest` becomes `(item: SavedText, trigger: HTMLElement) => void`, and each entry passes `event.currentTarget`. Same command -> `1 passed | 23 skipped (24)`. Suite `pnpm test` x3 -> 143 passed each (6.33 s, 6.53 s, 6.23 s); `pnpm build` passes
- refactor: the green step used `event.currentTarget as HTMLElement`, because `SavedTextItem` types its handler as a plain `MouseEventHandler`; removed in the next, structural commit
- commit: previous commit was `41d1646`
- state: DONE

## Refactor (U26): drop the type assertion on the Load trigger

- change: `SavedTextItem`'s `onLoadRequest` is typed `MouseEventHandler<HTMLButtonElement>`, so `Sidebar` passes `event.currentTarget` without `as HTMLElement` (constitution II: no unchecked assertions). No test changed.
- suite: `pnpm test` x3 -> 143 passed each (6.61 s, 6.25 s, 6.36 s); `pnpm build` passes
- commit: previous commit was `189bf5d`

## Cycle 36: A1 with a session in progress, Load on a different entry shows the discard question and leaves the session untouched

- (bookkeeping for the previous commit `0fe5f11`: T018 and T022 were ticked in that refactor commit, once U26 was DONE.)
- test: `src/App.test.tsx::App (specs/002-history-refinements, User Story 1) > [A1] with a session in progress, pressing Load on a different entry shows the discard question and leaves the session untouched` (new; real input via `userEvent` from `vitest/browser`; new helpers `addHistory()`, `loadButtonFor()`, `typingInput()`, `charactersTyped()`)
- red: `pnpm vitest run src/App.test.tsx -t "002-history-refinements.*\[A1\]"` -> `TestingLibraryElementError: Unable to find an accessible element with the role "dialog" and name "Discard your progress on this text?"` (1 failed | 33 skipped). The filter does not match `[A10]`-`[A19]`: `\]` must follow `A1`.
- **intended baseline changes to 001's tests (test-list planning notes), before the implementation:** `[A6] loading a different entry while another text is half typed ...` and `[A20] loading the entry that is currently running restarts it ...` Load mid-practice, which now asks first. Each gets one added step after that Load: click "Discard and load". Their assertions are unchanged. Red on the unchanged app: `-t "practice-history, User Story 2.*\[A(6|20)\]"` -> `Unable to find an accessible element with the role "button" and name "Discard and load"` (2 failed).
- green: `App` keeps `sessionTouched` (set by `PracticeView`'s `onTypingStarted`, reset on every start) and a `pendingLoad`. Load while `typingState === "running" && sessionTouched` stores the load and opens `ConfirmDiscardDialog` without writing; `onConfirm` starts the pending text. Confirm had to be wired in this cycle because the updated A6/A20 need it; A4 therefore follows as a first-run pass with a mutant check. `onCancel` is a no-op until A2. A1 -> `1 passed | 33 skipped (34)`; A6 + A20 -> `2 passed | 32 skipped (34)`. Suite `pnpm test` x3 -> 144 passed each (6.73 s, 6.57 s, 6.69 s); `pnpm build` passes
- refactor: none needed
- commit: previous commit was `0fe5f11`
- state: DONE. Ticked T038 (confirmed with the qualified filter, above).

## Cycle 37: A2 choosing Cancel closes the confirmation, keeps the same text and typed position, and returns focus to the pressed Load button

- test: `src/App.test.tsx::App (specs/002-history-refinements, User Story 1) > [A2] choosing Cancel closes the confirmation, ...` (new)
- red: `pnpm vitest run src/App.test.tsx -t "002-history-refinements.*\[A2\]"` -> `Error: expect(element).not.toBeInTheDocument() expected document not to contain element, found <dialog` (1 failed | 34 skipped)
- green: `onCancel` clears the pending load, so the dialog closes (its U22 effect). Same command -> `1 passed | 34 skipped (35)`. Suite `pnpm test` x3 -> 145 passed each (7.37 s, 6.97 s, 6.77 s); `pnpm build` passes
- finding: the focus assertion passed without `App` calling `trigger.focus()` (contracts/ui.md). In Chromium a click focuses the button, and closing a modal dialog restores focus to the element focused before it opened. The explicit call exists for Safari, where a click does not focus a button, so focus would not come back to it. That case is reproducible in Chromium with a DOM `click()` (which does not move focus), so it was **appended to the test list as A21** instead of being implemented untested in this cycle.
- refactor: none needed
- commit: previous commit was `dd86e89`
- state: DONE. Ticked T039 (qualified filter).

## Cycle 38: A3 pressing Escape on the confirmation does the same as Cancel (first-run pass)

- test: `src/App.test.tsx::App (specs/002-history-refinements, User Story 1) > [A3] pressing Escape on the confirmation does the same as Cancel` (new; real `Escape`). Besides A2's checks it presses the same Load again and expects the question again: the browser closes a modal dialog on Escape by itself, so "the dialog is gone" cannot show that the app let go of the held-back load.
- first run: `pnpm vitest run src/App.test.tsx -t "002-history-refinements.*\[A3\]"` -> `1 passed | 35 skipped (36)`. Passed: U17 forwards the `cancel` event and A2 wired `onCancel`.
- mutant: `ConfirmDiscardDialog` no longer forwards the native `cancel` event -> same command -> `TestingLibraryElementError: Unable to find an accessible element with the role "dialog" and name "Discard your progress on this text?"` (1 failed), at the "asks again" step. The four A2-style assertions passed under this mutant, which is why the extra step is in the test. Restored from the committed file.
- suite: `pnpm test` x3 -> 146 passed each (7.04 s, 6.98 s, 6.97 s); `pnpm build` passes
- refactor: none needed
- commit: previous commit was `479d08b`
- state: DONE. Ticked T040 (qualified filter).

## Cycle 39: A4 choosing "Discard and load" starts the chosen entry from its first character (first-run pass)

- test: `src/App.test.tsx::App (specs/002-history-refinements, User Story 1) > [A4] choosing Discard and load starts the chosen entry from its first character` (new)
- first run: `pnpm vitest run src/App.test.tsx -t "002-history-refinements.*\[A4\]"` -> `1 passed | 36 skipped (37)`. Expected: confirm was wired in cycle 36 (A1), because 001's updated A6/A20 needed it.
- mutant: `handleConfirmDiscard` clears the pending load without starting it -> same command -> `TestingLibraryElementError: Unable to find an element with the text: (_content, element) => element?.tagName === "P" && element.textContent === text` (1 failed: "second text" never loads); restored from the committed file
- suite: `pnpm test` x3 -> 147 passed each (7.26 s, 7.18 s, 7.09 s); `pnpm build` passes
- refactor: none needed
- commit: previous commit was `adca1a6`
- state: DONE. Ticked T041 (qualified filter).

## Cycle 40: A5 with a session in progress, Load on the running entry also shows the confirmation (first-run pass)

- test: `src/App.test.tsx::App (specs/002-history-refinements, User Story 1) > [A5] with a session in progress, pressing Load on the running entry also shows the confirmation` (new)
- first run: `pnpm vitest run src/App.test.tsx -t "002-history-refinements.*\[A5\]"` -> `1 passed | 37 skipped (38)`. Expected: A1's condition does not look at which entry is loaded.
- mutant: the condition exempts the running entry (`sessionInProgress && item.text !== session.text`) -> same command -> `TestingLibraryElementError: Unable to find an accessible element with the role "dialog" and name "Discard your progress on this text?"` (1 failed); restored from the committed file
- suite: `pnpm test` x3 -> 148 passed each (7.44 s, 7.49 s, 7.51 s); `pnpm build` passes
- refactor: none needed
- commit: previous commit was `940ccec`
- state: DONE. Ticked T042 (qualified filter).

## Cycle 41: A6 with a session started but nothing typed, Load loads immediately with no confirmation (first-run pass)

- test: `src/App.test.tsx::App (specs/002-history-refinements, User Story 1) > [A6] with a session started but nothing typed, pressing Load loads immediately with no confirmation` (new)
- first run: `pnpm vitest run src/App.test.tsx -t "002-history-refinements.*\[A6\]"` -> `1 passed | 38 skipped (39)`. Expected: A1's condition requires `sessionTouched`.
- mutant: `sessionInProgress = typingState === "running"` (typed-or-not ignored) -> same command -> `Error: expect(element).not.toBeInTheDocument() expected document not to contain element, found <dialog` (1 failed); restored from the committed file
- suite: `pnpm test` x3 -> 149 passed each (7.46 s, 7.44 s, 7.34 s); `pnpm build` passes
- refactor: none needed
- commit: previous commit was `a3ffe39`
- state: DONE. Ticked T043 (qualified filter).

## Cycle 42: A7 with a session finished, Load loads immediately with no confirmation (first-run pass)

- test: `src/App.test.tsx::App (specs/002-history-refinements, User Story 1) > [A7] with a session finished, pressing Load loads immediately with no confirmation` (new; types "hi" to the end and checks the finished message first)
- first run: `pnpm vitest run src/App.test.tsx -t "002-history-refinements.*\[A7\]"` -> `1 passed | 39 skipped (40)`. Expected: A1's condition requires `typingState === "running"`.
- mutant: `sessionInProgress = typingState !== "idle" && sessionTouched` (finished counts as in progress) -> same command -> `Error: expect(element).not.toBeInTheDocument() expected document not to contain element, found <dialog` (1 failed); restored from the committed file
- suite: `pnpm test` x3 -> 150 passed each (7.83 s, 7.96 s, 7.48 s); `pnpm build` passes
- refactor: none needed
- commit: previous commit was `9b37463`
- state: DONE. Ticked T044 (qualified filter).

## Cycle 43: A8 using only the keyboard, the user can open the confirmation, cancel it, open it again and confirm it (first-run pass)

- test: `src/App.test.tsx::App (specs/002-history-refinements, User Story 1) > [A8] using only the keyboard, ...` (new). After one click to start the session, keyboard only (real keys): type "fi", Tab (bounded loop) from the typing input to the second entry's Load button, Enter opens the question with Cancel focused, Enter cancels (focus back on Load), Space reopens, Tab to "Discard and load", Enter loads the entry from its first character.
- first run: `pnpm vitest run src/App.test.tsx -t "002-history-refinements.*\[A8\]"` -> `1 passed | 40 skipped (41)`. Expected: built by U14-U20 and A1-A4.
- mutant: "Discard and load" gets `tabIndex={-1}` -> same command -> `Error: expect(element).toHaveFocus()` (1 failed, the Tab to "Discard and load"); restored from the committed file
- suite: `pnpm test` x3 -> 151 passed each (8.13 s, 7.63 s, 7.66 s); `pnpm build` passes
- refactor: none needed
- commit: previous commit was `a157c70`
- state: DONE. Ticked T045 (qualified filter).

## Cycle 44: A14 pressing Load several times quickly while a session is in progress shows exactly one confirmation (first-run pass)

- test: `src/App.test.tsx::App (specs/002-history-refinements, User Story 1) > [A14] pressing Load several times quickly ...` (new). Three DOM `click()`s in a row on the same Load button (real input cannot reach an inert page once the modal is open, and Playwright would wait on the backdrop), then: exactly one dialog, and one Cancel leaves none.
- first run: `pnpm vitest run src/App.test.tsx -t "002-history-refinements.*\[A14\]"` -> `1 passed | 41 skipped (42)`. Expected: `App` holds a single pending load and renders a single dialog.
- mutant: a second `ConfirmDiscardDialog` rendered for the same pending load -> same command -> `TestingLibraryElementError: Found multiple elements with the role "dialog" and name "Discard your progress on this text?"` (1 failed); restored from the committed file. (A crude mutant; a queue of pending loads would fail the same way.)
- suite: `pnpm test` x3 -> 152 passed each (7.94 s, 7.93 s, 8.15 s); `pnpm build` passes
- refactor: none needed
- commit: previous commit was `31d252e`
- state: DONE. Ticked T046 (qualified filter).

## Cycle 45: A15 pressing Reset while a session is in progress returns to the empty setup box with no confirmation (first-run pass)

- test: `src/App.test.tsx::App (specs/002-history-refinements, User Story 1) > [A15] pressing Reset while a session is in progress returns to the empty setup box with no confirmation` (new)
- first run: `pnpm vitest run src/App.test.tsx -t "002-history-refinements.*\[A15\]"` -> `1 passed | 42 skipped (43)`. Expected: Reset was not changed (FR-006).
- mutant: `handleReset` returns early while running (Reset held back mid-session) -> same command -> `TestingLibraryElementError: Unable to find an element with the placeholder text of: Type or paste any text you want to practice...` (1 failed); restored from the committed file
- suite: `pnpm test` x3 -> 153 passed each (8.20 s, 8.30 s, 8.00 s); `pnpm build` passes
- refactor: none needed
- commit: previous commit was `df9f2c6`
- state: DONE. Ticked T047 (qualified filter), and T019 and T023 (A1-A8, A14, A15 all DONE).

## Cycle 46: A21 Cancel returns focus to the pressed Load button even when pressing it did not move focus there (added in cycle 37)

- test: `src/App.test.tsx::App (specs/002-history-refinements, User Story 1) > [A21] Cancel returns focus to the pressed Load button even when pressing it did not move focus there` (new). The Load button is activated with a DOM `click()`, which, like a click in Safari, does not focus it; focus stays in the typing input.
- red: `pnpm vitest run src/App.test.tsx -t "002-history-refinements.*\[A21\]"` -> `Error: expect(element).toHaveFocus() Expected element with focus: <button aria-labelledby="_r_7_ _r_6_" ...` (1 failed | 43 skipped). The browser returned focus to the typing input, the element focused before the dialog opened.
- green: `App`'s pending load keeps the `trigger` passed by `Sidebar` (U26); cancelling stores it, and an effect on `pendingLoad` focuses it once the load is cleared. The effect runs after the dialog's own effect has called `close()`, so the page is no longer inert. Same command -> `1 passed | 43 skipped (44)`. Suite `pnpm test` x3 -> 154 passed each (8.33 s, 8.33 s, 8.00 s); `pnpm build` passes
- refactor: none needed
- tasks: A21 has no task in `tasks.md` (it was added mid-loop), so nothing is ticked for it
- commit: previous commit was `6f6294b`
- state: DONE

## Cycle 47: U38 recordPractice on a new text creates one entry with numberOfLoads = 1 and numberOfCompletes = 0

- test: `src/features/savedItems/history.test.ts::[U38] on a new text creates one entry with a loaded count of 1 and a completed count of 0` (new describe block for 002's loaded count)
- red: `pnpm vitest run src/features/savedItems/history.test.ts -t "\[U38\]"` -> `AssertionError: expected { text: 'hello world', …(5) } to match object { numberOfLoads: 1, …(1) }` (1 failed | 25 skipped)
- green: `recordPractice` creates new entries with `numberOfLoads: 1`. Same command -> `1 passed | 25 skipped (26)`. Suite `pnpm test` x3 -> 155 passed each (8.62 s, 8.23 s, 8.00 s); `pnpm build` passes
- baseline check: 001's `[U14]` and `[U15]` assert only the completed count and the dates, not `numberOfLoads`, so neither needed changing (the planning notes expected `[U15]` might)
- refactor: `recordPractice`'s doc comment says "loaded count 1, completed count 0" for a new entry (comment only)
- commit: previous commit was `5e0fa8a`
- state: DONE

## Cycle 48: U39 recordPractice on an existing text adds 1 to numberOfLoads and leaves numberOfCompletes

- test: `src/features/savedItems/history.test.ts::[U39] on an existing text adds 1 to the loaded count and leaves the completed count` (new; seeds loads 3, completes 2)
- red: `pnpm vitest run src/features/savedItems/history.test.ts -t "\[U39\]"` -> `AssertionError: expected { text: 'hello world', …(5) } to match object { numberOfLoads: 4, …(1) }` (1 failed)
- green: the existing-entry update also sets `numberOfLoads: existing.numberOfLoads + 1`. Same command -> `1 passed | 26 skipped (27)`. Suite `pnpm test` x3 -> 156 passed each (8.28 s, 8.16 s, 8.25 s); `pnpm build` passes
- refactor: doc comment mentions "loaded count + 1" for an existing entry (comment only)
- commit: previous commit was `adfb4e4`
- state: DONE
