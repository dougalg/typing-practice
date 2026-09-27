---
detected_at: bfb1466
ecosystems: [typescript]
default: typescript
stacks:
  typescript:
    cwd: . # repository root; a worktree needs `pnpm install --frozen-lockfile` first
    runner: vitest # v5.0.1, jsdom environment, configured in vite.config.ts
    single: 'pnpm vitest run {file} -t "{name}"'
    file: pnpm vitest run {file}
    suite: pnpm test # package.json "test": "vitest run"; there is no CI config, so this is the gate
    watch: null # `pnpm test:watch` exists in package.json but is interactive and was not run
    coverage: null # @vitest/coverage-v8 is not installed
    mutation: null # no mutation tool installed (StrykerJS is the ecosystem default)
    acceptance: null # no browser/e2e runner installed (Playwright is the ecosystem default)
    property: null # no property-based library installed (fast-check is the ecosystem default)
    approval: null # vitest's built-in snapshots exist but are unused and were not verified
    contract: null
    test_glob: "src/**/*.test.{ts,tsx}"
    exemplar:
      unit: src/components/Heading.test.tsx
      acceptance: null # none exists; see the note on the outer loop below
    helpers:
      - src/test/setup.ts
verified: [single, file, suite]
suite_baseline: green
suite_seconds: 3
---

# TDD Stack Profile

## Conventions to match

- Tests sit beside the code as `<Name>.test.tsx` (components, views) or `<name>.test.ts` (pure
  logic and data access). This is required by constitution Principle IV.
- Vitest globals are **not** enabled. Import `describe`, `it`, `expect` (and `vi`, `beforeEach`,
  `afterEach`) explicitly from `"vitest"`.
- UI tests use `@testing-library/react` (`render`, `screen`) and query by role and accessible name
  (`getByRole("heading", { level: 2, name: "…" })`), as the exemplar does. Real user input goes
  through `@testing-library/user-event`, which is installed. Do not assert on class names or
  implementation details unless the class is the behavior (the exemplar checks a merged class name
  on purpose).
- `src/test/setup.ts` is the vitest `setupFiles` entry. It only imports
  `@testing-library/jest-dom/vitest`, so `toBeInTheDocument`, `toHaveClass` and similar matchers are
  available everywhere. Nothing else is registered yet: no IndexedDB, no axe matcher, no database
  reset, no factories.
- Exemplar to imitate: `src/components/Heading.test.tsx`. It is the only test in the repository, and
  it is a small presentational-component test. It is **not** an exemplar for persistence tests,
  App-level flows, accessibility checks or migrations; none exist yet.
- Prettier formats the code (tabs, `pnpm format`); write tests in the same style. Commits follow
  Conventional Commits.

## Notes and constraints

- **The whole suite runs in about 3 seconds** (1 file, 2 tests). Per-cycle full runs are fine.
- **Single-test command: read the counts, not the exit code.** `-t` takes a name pattern (a
  substring or regex), not an exact name, so a name that is a prefix of another test runs both. Verified against
  `Heading.test.tsx`: with a real name the summary is `1 passed | 1 skipped`; with a name that
  matches nothing vitest prints `2 skipped` with **0 passed and exits 0**. A pointing-at-nothing
  command therefore looks like a success. The loop must treat a run as valid only when the summary
  shows at least one `passed` (green step) or at least one `failed` (red step), and must reject a
  summary that is all `skipped`. A path to a test file that does not exist does exit 1.
- **Worktrees:** a fresh worktree has no `node_modules` and no `.specify/` content (both are
  untracked or ignored). Run `pnpm install --frozen-lockfile` before the suite. Add `--ignore-scripts`
  to skip the husky `prepare` script if the git hook path should not be touched.
- **IndexedDB:** jsdom has no IndexedDB, and `fake-indexeddb` is not installed. Any test touching
  `src/features/savedItems/db.ts` will fail until it is added (feature task T002 in
  `specs/001-practice-history/tasks.md`). Adding it is a separate dependency change and was not
  done by this command.
- **The outer loop has no dedicated runner.** There is no Playwright, Cypress or browser-mode
  vitest. For this app the highest-level test the repository can host is a Testing Library test that
  renders the real `App` component (`src/App.tsx`) and drives it with `user-event`, run with the
  `file` command. Such a test exercises the composed modules and real React, but not a real browser
  or real focus and layout behavior, so the test list must label those outer behaviors as
  integration-level, not end-to-end.
- **Areas with no tests** (need characterization tests before they are changed): `src/App.tsx`,
  `src/views/PracticeView.tsx`, `src/views/SetupView.tsx`, `src/views/Sidebar.tsx`,
  `src/components/SavedTextItem.tsx`, `src/layouts/Page.tsx`, `src/features/savedItems/db.ts`. Only
  `src/components/Heading.tsx` has tests.
- **Missing capabilities and their consequence:**
  - No coverage: uncovered behavior cannot be found by measurement. The audit falls back to tracing
    every acceptance criterion to a named test. (`@vitest/coverage-v8`, matching vitest 5.0.1.)
  - No mutation tool: test strength is checked with deliberate mutants on the highest-risk
    behaviors instead. (StrykerJS with its vitest runner.)
  - No property-based library: invariants are sampled at their boundaries with example tests, and
    the test list should say so. (`fast-check`.)
  - No accessibility matcher yet, although the constitution (Principle V) requires axe checks. See
    feature task T002/T003.
- Constitution Principle III ("Test-First for Behavior") already requires tests written "before or
  alongside" the implementation. See the setup report for how that compares with the TDD principle.
