<!--
Sync Impact Report
Version change: 1.1.0 → 1.2.0 (2026-09-21, MINOR: materially expanded guidance)
Modified principles:
  - III. Test-First for Behavior → III. Test-Driven Development (NON-NEGOTIABLE)
    ("tests written before or alongside" tightened to "a test that failed first", with recorded
    failure evidence, mandatory test tasks, no weakening of tests, an acceptance test per
    criterion, refactor-on-green, and test-strength verification). The previous rules on Testing
    Library usage, extracted pure logic, bug-fix tests, accessibility tests and `pnpm test`
    are kept. Compliance plan for existing code: none needed, since it adds tests only when
    behavior changes; untested files get characterization tests before they are changed.
Earlier history: (blank template) → 1.1.0 (drafted as 1.0.0, amended before commit)
Modified principles:
  - V. Keyboard-First Accessible Typing Experience → V. Accessible by Default (WCAG 2.2 AA)
    (expanded to require WCAG 2.2 Level AA plus accessibility tests)
  - III. Test-First for Behavior (added accessibility test requirement)
Added principles:
  - I. Local-First, No Backend
  - II. Strict Type Safety
  - III. Test-First for Behavior
  - IV. Feature-Oriented Structure
  - V. Accessible by Default (WCAG 2.2 AA)
Added sections: Technology & Tooling Constraints; Development Workflow & Quality Gates
Removed sections: none
Follow-up TODOs: an axe-based test dependency (e.g. vitest-axe) is not yet installed; add it
  when the first accessibility test is written. Ratification date set to the date of first adoption (2026-09-20).
Templates: not modified by this command; they read the constitution at runtime.
-->

# Typing Practice Constitution

## Core Principles

### I. Local-First, No Backend

The app MUST run entirely in the browser. User data (saved practice texts, load/completion
counts) MUST be persisted on-device via IndexedDB through Dexie, and MUST NOT be sent to any
server or third-party service. New features MUST NOT introduce a required network dependency,
account system, or telemetry. Any change to a Dexie schema MUST add a new `version(n)` with an
upgrade path so existing users' saved data is preserved.

Rationale: Typing practice text is personal and may be sensitive; a local-only app is private,
works offline, and has no operational cost.

### II. Strict Type Safety

All source MUST be TypeScript compiled under the `strict` settings in `tsconfig.json`
(including `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, and
`verbatimModuleSyntax`). `any` and unchecked type assertions MUST NOT be used without a comment
justifying them. Shared domain types (e.g. `TypingState`, `SavedText`) MUST be defined once and
imported, not redeclared. `pnpm build` (`tsc && vite build`) MUST pass before code is merged.

Rationale: The typing state machine and persisted records are easy to corrupt with silent type
drift; the compiler is the cheapest guard.

### III. Test-Driven Development (NON-NEGOTIABLE)

Every behavior change and bug fix MUST be driven by a Vitest test that failed first.

- The test MUST be observed failing, for the right reason, before the code that makes it pass.
  The failure output MUST be recorded in `specs/<feature>/tdd/cycle-log.md`. A run whose summary
  shows only skipped tests is not a failure and does not count.
- Test tasks are not optional. `tasks.md` MUST place each behavior's test task before its
  implementation task, and the implementation task MUST NOT be started until the test is red.
- Tests MUST NOT be weakened, skipped, deleted, or filtered out to reach green. When a test and
  the code disagree, `spec.md` decides which is wrong.
- Every acceptance criterion in `spec.md` MUST have at least one acceptance test that exercises
  the real entry point. Where no browser runner exists, this is a Testing Library test that
  renders the real `App`, and the test list MUST label it as integration-level.
- Refactoring MUST happen only on a green suite, and MUST NOT change a test in the same commit
  as a behavior change.
- Test strength MUST be verified, not assumed: mutation testing on the changed files where a
  mutation tool exists, and a deliberate-mutant spot check where it does not.
- UI behavior MUST be tested through Testing Library from the user's perspective (roles, labels,
  visible text, real user events), not by asserting on implementation details. Pure logic (e.g.
  correct/incorrect marking, position tracking, completion detection) SHOULD be extracted from
  components so it can be tested without rendering. A bug fix MUST include a test that fails
  without the fix. Accessibility requirements (Principle V) MUST be tested as part of this rule.
  `pnpm test` MUST pass before code is merged.

Rationale: The core value of the app is that typed input is judged correctly; regressions there
are invisible until a user notices them. A test written after the code can only describe what
the code already does, so it cannot catch the code being wrong.

### IV. Feature-Oriented Structure

Code MUST follow the existing layout: `src/views/` for screen-level components,
`src/components/` for reusable presentational components, `src/layouts/` for page scaffolding,
and `src/features/<name>/` for domain logic and data access (e.g. `features/savedItems/db.ts`).
Views MUST access persistence only through a feature module, and reusable components MUST NOT
import from `views/` or `features/`. Tests MUST live beside the code they cover
(`Foo.tsx` / `Foo.test.tsx`). Styling MUST use Tailwind utility classes; new global CSS in
`src/style.css` requires justification.

Rationale: Clear dependency direction keeps components reusable and lets persistence and typing
logic change without rippling through the UI.

### V. Accessible by Default (WCAG 2.2 AA)

Every view, component, and interaction MUST conform to WCAG 2.2 Level AA, and that conformance
MUST be verified by tests. Specifically:

- Every view and reusable component MUST have an automated axe-core check (e.g. via
  `vitest-axe`) in its test file, in each meaningful state (e.g. idle, running, finished, error).
  Such checks MUST report zero violations.
- Keyboard operation MUST be tested with `@testing-library/user-event`: the practice flow MUST be
  fully operable by keyboard, focus MUST move to the typing input when a run starts, and every
  interactive control MUST have an accessible name and a visible focus indicator.
- Text and UI-component colors MUST meet AA contrast (4.5:1 for normal text, 3:1 for large text
  and UI components) in every theme. Because jsdom cannot compute rendered contrast, contrast
  MUST be checked against the actual palette (design tokens or a browser tool) and the result
  noted in the PR when colors change.
- Correct/incorrect feedback MUST NOT rely on color alone, and status or error messages MUST be
  announced to assistive technology (e.g. via `role="alert"` or a live region).
- Input handling MUST respect IME composition (`isComposing`) and MUST NOT swallow browser or OS
  shortcuts it does not need to handle.
- Automated checks do not cover all of WCAG. Changes that add or alter interactions MUST also be
  checked manually (keyboard-only pass, and zoom to 200% / reflow at narrow widths) before merge.

Rationale: This is a keyboard tool used by many kinds of people; accessibility that is not tested
regresses silently, so conformance is a merge requirement rather than an aspiration.

## Technology & Tooling Constraints

- Stack: React 19, TypeScript, Vite, Tailwind CSS v4, Dexie, Vitest with jsdom and Testing
  Library, plus an axe-core matcher (e.g. `vitest-axe`) for accessibility tests. Adding a
  runtime dependency MUST be justified in the PR description; prefer the platform and existing
  dependencies first.
- Package manager: pnpm only, at the version pinned in `packageManager`. The lockfile
  (`pnpm-lock.yaml`) MUST be committed and MUST NOT be edited by hand.
- Formatting: Prettier (with the Tailwind plugin) is the sole formatter; `pnpm format` output
  MUST NOT produce a diff on committed code.
- Deployment target is static hosting of the Vite `dist/` output; no server runtime may be
  required.

## Development Workflow & Quality Gates

- Commits MUST follow Conventional Commits, enforced by commitlint via the Husky `commit-msg`
  hook. Use `pnpm commit` (Commitizen with cz-git) for guided commits. Scopes SHOULD come from the
  list in `commitlint.config.js`.
- Work MUST be done on a branch and merged through a pull request; `main` MUST stay releasable.
- Before opening or merging a PR, `pnpm test` and `pnpm build` MUST both pass, including the
  accessibility checks required by Principle V.
- Reviewers MUST check changes against the Core Principles; any deviation MUST be called out in
  the PR and justified in writing.
- Dependency upgrades that cross a major version MUST be isolated in their own commit or PR.
- Simplicity: start with the simplest solution that satisfies the spec (YAGNI). Added abstraction
  or configurability MUST be justified by a current requirement.

## Governance

This constitution supersedes other project practices where they conflict. Amendments MUST be made
by editing `.specify/memory/constitution.md` through a pull request that states the reason for the
change, updates the version, and updates the Last Amended date. Amendments that alter behavior
required of existing code MUST include a plan for bringing that code into compliance.

Versioning follows semantic versioning: MAJOR for removing or redefining a principle in a
backward-incompatible way; MINOR for adding a principle or section or materially expanding
guidance; PATCH for clarifications, wording, and typo fixes.

Compliance is reviewed at PR time (see Development Workflow) and whenever a feature plan is
produced, where the plan MUST include a check of the Core Principles. Runtime development
guidance for agents lives in `CLAUDE.md` when present.

**Version**: 1.2.0 | **Ratified**: 2026-09-20 | **Last Amended**: 2026-09-21
