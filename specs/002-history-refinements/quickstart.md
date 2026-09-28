# Quickstart: Validating Practice History Refinements

## Prerequisites

- pnpm at the version in `packageManager`; `pnpm install`.
- One-off: `pnpm exec playwright install chromium` (the browser Vitest drives).

## Automated checks

```sh
pnpm test     # Vitest browser mode, headless Chromium: unit, integration, axe, screen-reader output
pnpm build    # tsc strict, then vite build
pnpm format   # must leave no diff
```

| Area                                                                                    | Test file                          | Proves                                                   |
| --------------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------- |
| Load counts, version 4 correction                                                       | `history.test.ts`, `db.test.ts`    | FR-008, FR-009, FR-011                                   |
| Counts display                                                                          | `SavedTextItem.test.tsx`           | FR-007                                                   |
| Dialog behavior and accessibility                                                       | `ConfirmDiscardDialog.test.tsx`    | FR-003, FR-005                                           |
| Typing-started signal, axe                                                              | `PracticeView.test.tsx`            | FR-001, FR-004                                           |
| Confirm flow end to end, `A16`, storage failure, reflow, contrast, screen-reader output | `App.test.tsx`, `Sidebar.test.tsx` | US1, US2, SC-001–SC-004; `001` checks 11, 12, 15, 16, 17 |

## Remaining manual checks

Only what a test cannot judge:

1. Focus ring on the dialog's buttons and the Load buttons looks clearly visible.
2. VoiceOver (Cmd+F5) spot check: press Load mid-practice; the dialog and its question are announced,
   Escape returns you to the Load button.
