# Contract: UI changes

Tests target roles, names, visible text and focus, not implementation (Constitution III). Changes from
[`001`'s UI contract](../../001-practice-history/contracts/sidebar-ui.md) only.

## `ConfirmDiscardDialog` (new component)

```ts
export interface ConfirmDiscardDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void; // Cancel button or Escape
}
```

| Element | Role / name                                                                  | Behavior                                                               |
| ------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Dialog  | `dialog`, modal, named by its question "Discard your progress on this text?" | Opened with `showModal()` when `open` becomes true; rest of page inert |
| Cancel  | `button` "Cancel"                                                            | Focused when the dialog opens; calls `onCancel`                        |
| Confirm | `button` "Discard and load"                                                  | Calls `onConfirm`                                                      |
| Escape  | —                                                                            | Calls `onCancel` (native `cancel` event)                               |

Focus stays inside the dialog while open (native modal behavior). Both buttons use the shared `Button`
component from `main`'s restyle. Must not import from `views/` or `features/`.

## `SavedTextItem`

"Practiced N time(s)" is replaced by two lines, in the theme's existing muted text style
(`text-ink-muted`, from `main`'s restyle):

- "Loaded: {numberOfLoads}"
- "Completed: {numberOfCompletes}"

No singular/plural forms needed.

## `Sidebar`

```ts
onLoadRequest: (item: SavedText, trigger: HTMLElement) => void;
```

`trigger` is the Load button that was pressed (`event.currentTarget`), so focus can return to it after a
cancelled confirmation, including in Safari, where clicking a button does not focus it.

## `PracticeView`

```ts
onTypingStarted?: () => void; // first input of this run, correct or wrong, including composition end
```

## `App` integration

| Event                                                    | Action                                                         |
| -------------------------------------------------------- | -------------------------------------------------------------- |
| Start or Load (not in progress)                          | As 001; `sessionTouched = false`                               |
| `onTypingStarted`                                        | `sessionTouched = true`                                        |
| Load while `typingState === "running" && sessionTouched` | Store `{ item, trigger }`; open dialog; no write               |
| Dialog confirm                                           | Start session with `item.text` (writes as Start); close dialog |
| Dialog cancel / Escape                                   | Close dialog; session untouched; `trigger.focus()`; no write   |
| Reset                                                    | As 001, no dialog (FR-006)                                     |

## Page layout

No change. `main` (PR #7) already lays the page out as a single column at every width. A reflow test at
320 CSS px guards it (WCAG 1.4.10).
