# Contract: Sidebar and history entry UI

The UI surface this feature exposes to the user. Tests target these roles, names and visible texts,
not implementation details (Constitution Principle III).

## `Sidebar` (view)

```ts
export interface SidebarProps {
	onLoadRequest: (item: SavedText) => void;
	/** Set by App when a history write failed; shown as an alert. */
	saveError?: boolean;
}
```

| Element | Role / name | Behaviour |
|---------|-------------|-----------|
| Container | region named "Practice History" (via its level-2 heading) | Always present |
| Entry list | `list` of `listitem`, most recently practiced first | Scrolls when long; no cap on entries |
| Empty state | text: "No practice history yet. Texts you practice will appear here." | Shown only when the store is readable and has no entries (FR-011) |
| Read failure | `alert`: "Practice history could not be loaded." | Shown when `useHistory` reports `error` (FR-013) |
| Save failure | `alert`: "Your practice history could not be saved. You can keep practicing." | Shown when `saveError` is true (FR-013) |

Alerts are announced by assistive technology and are not colour-only (they are text).

## `SavedTextItem` (component)

```ts
export interface SavedTextItemProps {
	id: number;
	text: string;
	dateModified: Date;
	numberOfCompletes: number; // the practice count
	onLoadRequest: MouseEventHandler;
}
```

The component takes the fields it displays from the shared `SavedText` type. It must not import from
`views/` or `features/`.

| Element | Role / name | Behaviour |
|---------|-------------|-----------|
| Preview | text, clamped to 3 lines by styling; full text stays in the DOM for assistive technology | Long text never breaks the layout |
| Last practiced | visible text "Last practiced: {medium date}" using `dateModified` | FR-006 |
| Practice count | visible text "Practiced {n} times" from `numberOfCompletes`; "Practiced 1 time" for 1; "Practiced 0 times" for 0. It is the only count shown | FR-006 |
| Load control | `button` whose accessible name is "Load" followed by the preview, e.g. "Load The quick brown fox…" | Focusable, activated by Enter and Space, visible focus ring (FR-007, FR-014) |

## Keyboard and focus

- Tab reaches each Load button in list order; Enter and Space activate it.
- After a Load, the practice view is remounted and focus moves to the typing input (existing behaviour of `PracticeView` on entering the `running` state).
- Nothing in the sidebar traps focus or requires a pointer.

## Layout

The sidebar stays in the existing 3-of-12 grid column. Entries wrap and clamp instead of
overflowing, and the list must remain readable at 200% zoom and at narrow widths (Principle V
manual check).
