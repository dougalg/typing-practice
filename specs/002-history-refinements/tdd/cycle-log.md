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
