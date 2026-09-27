# Research: Practice History Refinements

## R1. Test platform: Vitest browser mode instead of jsdom

**Decision** (user, 2026-09-27): run the whole suite in Vitest browser mode with the Playwright
provider (`@vitest/browser-playwright` 5.0.1, peer `playwright`), Chromium only, headless.

**Findings that drove it**:

- jsdom 30.1.0's `HTMLDialogElement` is an empty class (`HTMLDialogElement-impl.js` has no `show`,
  `showModal` or `close`). The confirm dialog's real behavior (focus kept inside, Escape cancels, rest
  of page inert) cannot be tested in jsdom at all, only stubbed.
- jsdom cannot compute layout or colour, so `001`'s reflow and contrast checks stayed manual.
- `001` needed `fake-indexeddb` plus several workarounds for it; a real browser has real IndexedDB.
- A separate Playwright end-to-end suite was the alternative. Rejected: two runners, two styles, and an
  `e2e/` folder that breaks the "tests beside code" rule. Browser mode gets real-browser fidelity inside
  the existing runner and file layout.

**Browsers**: Chromium only. WebKit would catch Safari's "clicking a button doesn't focus it" quirk, but
the design sidesteps it (R6 passes the trigger element explicitly), so the extra browser download and
doubled run time are not worth it now.

**Residual**: a true page reload cannot happen inside a browser-mode test (it would reload the test
itself). Unmounting and remounting `App` against real IndexedDB covers what the reload check proved.

## R2. Migration strategy

**Decision**: migrate first, as its own step on a green suite, with **no behavior change**: the same 93
tests, same names, all passing, before any 002 test is written.

- Enable `test.browser` in `vite.config.ts`; drop `fake-indexeddb/auto` from `src/test/setup.ts`.
- Keep Testing Library queries and the existing `@testing-library/user-event` calls unless a test breaks.
  New tests that depend on native behavior (dialog Escape, Tab containment, focus) use `userEvent` from
  `vitest/browser`, which sends real input through Playwright.
- Expected trouble spots, each fixed in the test and recorded, never by weakening: `vi.useFakeTimers
({ toFake: ["Date"] })` under browser mode; tests that close and reopen `savedTextsDb`; IndexedDB
  persisting between test files (a real browser keeps it per origin, so the existing per-test table clear
  becomes load-bearing); any timing that jsdom made synchronous.
- Measure suite time before and after; record it in the TDD profile (`/speckit-tdd-setup refresh`).
- Remove `fake-indexeddb` and `jsdom` only once everything is green without them.

## R3. Constitution and profile

The constitution's Technology section names "Vitest with jsdom and Testing Library". Proposed amendment
(MINOR, 1.2.0 → 1.3.0): "Vitest in browser mode (Playwright provider, Chromium) with Testing Library",
and Principle V's note that "jsdom cannot compute rendered contrast" becomes "contrast is checked by axe
in the real browser". Shown to the user before applying. The TDD profile is refreshed after the
migration (runner, timings, the acceptance layer now being a real browser).

## R4. `A16` becomes testable

`001` blocked `A16` because seeding version-1 data meant deleting the shared database mid-suite. Dexie
opens lazily and `close()`/`open()` was later shown to work, so: `savedTextsDb.close()`, delete the
database, seed it with a raw version-1 Dexie instance, close that, `savedTextsDb.open()` (runs every
upgrade), then render `App` and assert one entry per text with the merged counts. With 002's version 4,
the same test also checks the load-count correction.

## R5. Loaded count

`numberOfLoads` already exists and was preserved (summed) through `001`'s upgrade, but `001` stopped
updating it and wrote 0 for new entries. Decision: `recordPractice` increments it on every start or load
(new entry: 1; existing: +1; the two-writer retry path: +1). A version 4 upgrade sets each row's
`numberOfLoads` to `max(numberOfLoads, numberOfCompletes, 1)`, a lower bound, per spec FR-011. No store
or index change, so version 4 repeats version 3's store definition with an `.upgrade()`.

## R6. Detecting "session in progress" and the dialog

- `PracticeView` owns position and marks. It gets an optional `onTypingStarted` prop, called on the first
  input of a run, correct or wrong, including composition end. Because `PracticeView` is keyed by
  `runId`, "first per mount" is "first per session". `App` keeps `sessionTouched`, reset on every start.
- In progress = `typingState === "running" && sessionTouched`.
- `Sidebar` passes the Load button element with the request (`onLoadRequest(item, trigger)`). Relying
  on `document.activeElement` fails in Safari, where clicking a button does not focus it.
- `ConfirmDiscardDialog` is a native `<dialog>` opened with `showModal()`: the browser provides focus
  containment, Escape (`cancel` event) and inertness. `aria-labelledby` points at its question. Cancel
  has `autoFocus`. On cancel or Escape, `App` clears the pending load and focuses the stored trigger.
- Alternative rejected: `window.confirm()`. Accessible, but unstyled, blocks the thread, and cannot be
  driven or inspected in tests.

## R7. Screen-reader assertions

**Decision**: `@guidepup/virtual-screen-reader` (0.33.0), which walks the accessibility tree and
produces the phrases a screen reader would speak, in order. It is DOM-based, so it runs in browser mode.
A small `src/test/screenReader.ts` helper returns the spoken phrase log for a container.

Covers: sidebar region name, entries newest first, each Load button's name, empty state, both alerts,
the dialog's role and question, and the two counts. **Verify at implementation** that it runs under
Vitest 5 browser mode; fallback is asserting accessible names and DOM order via Testing Library, which
is weaker (no reading-order semantics) and would be reported.

## R8. Reflow and contrast

- Reflow (WCAG 1.4.10): set the viewport to 320 CSS px wide (`page.viewport` from `vitest/browser`) and
  assert no horizontal overflow and that sidebar entries are fully visible. Expected to fail today:
  `Page.tsx` uses a fixed 12-column grid (sidebar = 3 columns ≈ 80 px at 320 px). Fix: single column on
  narrow screens, 9/3 split from a medium breakpoint. In scope as `001` FR-014 carried over.
- Contrast: `expectNoA11yViolations` already runs axe; in a real browser axe's `color-contrast` rule
  actually computes colours. Add one populated-sidebar check that would fail on low contrast (verified
  with a deliberate low-contrast mutant).

## R9. Storage failure in a real browser

Keep the `close()`-based read-failure tests. Add one test where IndexedDB is unusable from the start:
stub Dexie's `indexedDB` dependency (`Dexie.dependencies.indexedDB`) so `open` fails, then render `App`
and assert practice still works and the alert shows. **Verify at implementation**; fallback is the
existing `close()` path, which already proves the same user-visible behavior.
