# Quickstart: Validating Practice History

How to prove the feature works end to end once implemented. Details of the data live in
[data-model.md](./data-model.md); the module and UI contracts are in [contracts/](./contracts/).

## Prerequisites

- Node with pnpm at the version in `packageManager`.
- In a fresh worktree or clone: `pnpm install`. This also installs the two new dev dependencies (`fake-indexeddb`, `vitest-axe`).

## Automated checks

```sh
pnpm test     # Vitest: unit, IndexedDB (fake-indexeddb), UI and axe tests
pnpm build    # tsc under strict settings, then vite build
pnpm format   # must leave no diff
```

Both `pnpm test` and `pnpm build` must pass (Constitution quality gates). The test files that
prove each area:

| Area | Test file | Proves |
|------|-----------|--------|
| Normalisation, upsert, completion, ordering, failures | `src/features/savedItems/history.test.ts` | FR-001 to FR-005, FR-009, FR-010, FR-013 |
| Migration from existing data | `src/features/savedItems/db.test.ts` | FR-012, SC-003 |
| Entry display and accessible Load name | `src/components/SavedTextItem.test.tsx` | FR-006, FR-007, FR-014 |
| Sidebar list, empty and error states, axe | `src/views/Sidebar.test.tsx` | FR-005, FR-011, FR-013, FR-014 |
| Start, load, mid-practice load, completion, keyboard-only flow | `src/App.test.tsx` | US1, US2, US3, SC-001, SC-005 |

## Manual scenarios (run `pnpm dev`, open the printed local URL)

Use a normal window. Clear site data first if you want a first-visit state.

1. **First visit**: the sidebar shows the empty-state message.
2. **Store (US1)**: enter "hello world", press Start. Reload the page. The text is in the sidebar (SC-002).
3. **No duplicates (US1)**: Reset, enter the same text again, Start. Still one entry, moved to the top, practice count now 2 (SC-003).
4. **Empty text (US1)**: clear the box and Start. The existing message appears and nothing is added.
5. **Load (US2)**: enter a second text and start it, Reset, then use Load on the first entry. Practice begins with the first entry's text, typing input focused, progress at zero (SC-001).
6. **Load mid-practice (US2)**: type a few characters, then Load another entry. Progress is cleared and the new text starts at the first character. Load the same entry that is running: it also restarts.
7. **Counts (US3)**: type a text to the end. Its completed count goes up by one without reloading (SC-004). Start another and Reset before finishing; its completed count does not change.
8. **Long text**: paste several thousand characters. The sidebar entry shows a short preview and does not overflow; Load still types the full text.
9. **Keyboard only (SC-005)**: without a mouse, Tab to an entry's Load button and press Enter, then Space on another. Both load.
10. **Legacy data**: in DevTools, seed the version 1 database with duplicate rows (or open the app from `main` first to create some), then run this branch. Duplicates collapse to one entry each with summed counts (FR-012).
11. **Storage unavailable**: in a private window or with site data blocked (or by deleting the database in DevTools while the tab is open), the app still lets you practice and shows the alert message.

## Constitution manual checks (Principle V)

- Keyboard-only pass through steps 5 to 9.
- Zoom to 200% and narrow the window: the sidebar entries reflow without clipping.
- Contrast: confirm the text colours used on the new entry elements are at least 4.5:1 against their background (slate-600 or darker on white); note the result in the PR.

## Expected outcomes

All automated checks green, every manual scenario behaving as stated above, and no network requests
in the browser's Network tab while using the app (FR-015).
