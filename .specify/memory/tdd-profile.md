---
detected_at: fa1e8fc
ecosystems: [typescript]
default: typescript
stacks:
  typescript:
    cwd: . # repository root; a worktree needs `pnpm install --frozen-lockfile` first
    runner: vitest # v5.0.2 in browser mode: headless Chromium via @vitest/browser-playwright 5.0.2, configured in vite.config.ts
    single: 'pnpm vitest run {file} -t "{name}"'
    file: pnpm vitest run {file}
    suite: pnpm test # package.json "test": "vitest run"; there is no CI config, so this is the gate
    watch: null # `pnpm test:watch` exists in package.json but is interactive and was not run
    coverage: null # @vitest/coverage-v8 is not installed
    mutation: null # no mutation tool installed (StrykerJS is the ecosystem default)
    acceptance: pnpm vitest run src/App.test.tsx # the same runner: App rendered in a real browser, not a separate e2e runner
    property: null # no property-based library installed (fast-check is the ecosystem default)
    approval: null # vitest's built-in snapshots exist but are unused and were not verified
    contract: null
    test_glob: "src/**/*.test.{ts,tsx}"
    exemplar:
      unit: src/components/SavedTextItem.test.tsx
      acceptance: src/App.test.tsx
    helpers:
      - src/test/setup.ts
      - src/test/a11y.ts
      - src/test/screenReader.ts
verified: [single, file, suite, acceptance]
suite_baseline: green
suite_seconds: 6
---

# TDD Stack Profile

Refreshed for Vitest browser mode (specs/002-history-refinements, task T008). The previous profile
(`bfb1466`) described jsdom with one test file.

## Conventions to match

- Tests sit beside the code as `<Name>.test.tsx` (components, views, `App`) or `<name>.test.ts`
  (pure logic and data access). Required by constitution Principle IV.
- Every test runs in a real browser: headless Chromium, launched by Playwright through
  `@vitest/browser-playwright` (`vite.config.ts` → `test.browser`). There is no jsdom. Layout,
  focus, `<dialog>`, colours and IndexedDB are the browser's own. The default viewport is
  414 × 896 CSS px; `page.viewport(width, height)` from `vitest/browser` changes it.
- Vitest globals are **not** enabled. Import `describe`, `it`, `expect`, `vi`, `beforeEach`,
  `afterEach` explicitly from `"vitest"`.
- Test names start with the behavior id in brackets, e.g. `it("[U41] the Load button's ...")`,
  so `-t "\[U41\]"` selects them. Describe blocks name the spec and contract they come from.
- UI tests use `@testing-library/react` (`render`, `screen`, `within`, `waitFor`) and query by
  role and accessible name. Existing tests drive input with `@testing-library/user-event`
  (`userEvent.setup()`), which dispatches synthetic events. Where native browser behavior is the
  point (dialog Escape, Tab containment, real focus), use `userEvent` from `vitest/browser`, which
  sends real input through Playwright.
- `role="alert"` does not take its accessible name from its text: query `getByRole("alert")` and
  assert `toHaveTextContent`.
- Module-level spying: ES module namespaces are real in the browser and cannot be redefined, so a
  test file that spies on a module's export first declares `vi.mock("<path>", { spy: true })`
  (see `src/App.test.tsx`). Spying on object methods (`vi.spyOn(savedTextsDb.savedTexts, "add")`)
  works as usual.
- Exemplars to imitate: `src/components/SavedTextItem.test.tsx` for a component unit test,
  `src/features/savedItems/history.test.ts` / `db.test.ts` for data access (seeding raw older
  schemas under a throwaway database name), and `src/App.test.tsx` for an acceptance test (renders
  the real `App`, helper functions for the recurring queries such as `setupBox()`,
  `sidebarRegion()`, `getPracticeText()`).
- Helpers:
  - `src/test/setup.ts` (vitest `setupFiles`): registers `@testing-library/jest-dom` matchers, runs
    Testing Library `cleanup()` after each test (globals are off, so it would not self-register),
    and clears `savedTextsDb.savedTexts` after each test. The clear is load-bearing: the browser's
    IndexedDB is real and shared by every test file.
  - `src/test/a11y.ts`: `expectNoA11yViolations(container)` runs axe-core directly and fails with
    a summary of violations. In the real browser, axe's `color-contrast` rule computes rendered
    colours.
  - `src/test/screenReader.ts`: `spokenPhrases(container)` reads the container once, start to end,
    with `@guidepup/virtual-screen-reader` and returns the spoken phrases in order (e.g.
    `["button, Save draft", "S", "end of button, Save draft"]`). Use it to assert what a screen
    reader announces and in what order, which axe cannot check.
- Prettier formats the code (tabs, `pnpm format`); write tests in the same style. Commits follow
  Conventional Commits with lowercase subjects (commitlint).

## Notes and constraints

- **Suite time:** `pnpm test` → 109 passed in 5.7–6.1 s (Duration), measured at `fa1e8fc`
  (jsdom was 4.3–4.5 s). Per-cycle full runs are fine.
- **Single-test command: read the counts, not the exit code.** `-t` takes a name pattern (a
  substring or regex), not an exact name. Verified at `fa1e8fc`:
  `pnpm vitest run src/App.test.tsx -t "\[A14\]"` → `1 passed | 29 skipped (30)`;
  `pnpm vitest run src/App.test.tsx -t "no such test xyz"` → `30 skipped (30)`, `1 skipped` file,
  **exit 0**. A run counts as red only with at least one `failed`, as green only with at least
  one `passed`; an all-`skipped` summary means the filter matched nothing. Escape the brackets of
  behavior ids (`"\[A1\]"`), and note `"\[A1\]"` does not match `[A10]` because `]` must follow.
- `pnpm vitest run src/components/Heading.test.tsx` (file command) → `2 passed (2)`, exit 0.
- **Build is a separate gate:** `pnpm build` runs `tsc`, which type-checks test files too; a
  green `pnpm test` does not imply a green `tsc`. Run both before calling a cycle green.
- **Failure screenshots are off** (`screenshotFailures: false`), so a red does not write
  `__screenshots__/` into the tree.
- **Cold Vite cache:** a test-only dependency discovered mid-run makes Vite reload the page and
  can fail that test ("Vite unexpectedly reloaded a test"). `@guidepup/virtual-screen-reader` is
  listed in `optimizeDeps.include` for that reason; add any new test-only dependency there too.
- **Worktrees:** a fresh worktree has no `node_modules`. Run `pnpm install --frozen-lockfile`, and
  `pnpm exec playwright install chromium` once per machine (the browser binary is cached under
  `~/Library/Caches/ms-playwright`).
- **No real page reload** is possible inside a browser-mode test (it would reload the test
  runner); unmount and remount `App` against the same IndexedDB instead.
- **Storage failure:** do not mock a Dexie method to throw in `App`/`Sidebar` tests; it was found
  (in 001) to poison `dexie-react-hooks`' live-query cache for later tests. Use the real
  `savedTextsDb.close()` / `savedTextsDb.open()` instead. (`history.test.ts`'s `[U30]` still mocks
  `orderBy` on a `renderHook`, and has not flaked in browser mode.)
- **Areas with no tests:** `src/views/PracticeView.tsx`, `src/views/SetupView.tsx`,
  `src/layouts/Page.tsx`, `src/components/Panel.tsx`. They need characterization tests before
  they are changed.
- **Missing capabilities and their consequence:**
  - No coverage: uncovered behavior cannot be found by measurement; the audit traces every
    acceptance criterion to a named test instead. (`@vitest/coverage-v8`, matching vitest 5.0.2.)
  - No mutation tool: test strength is checked with deliberate mutants on the highest-risk
    behaviors. (StrykerJS with its vitest runner.)
  - No property-based library: invariants are sampled at their boundaries with example tests.
    (`fast-check`.)
- Not checked: watch mode (interactive), WebKit and Firefox (only Chromium is configured).
