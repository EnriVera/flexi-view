# Spec: sort-action-modal

## Change name
`sort-action-modal`

## Scope summary
This change introduces two new components (`fv-sort-button` and `fv-sort-modal`) and redesigns `fv-sort-action` into a single-button modal trigger. `fv-header-menu` is updated to use `fv-sort-button` instead of `fv-sort-action` for its per-direction chip rendering, preserving its existing sort UI without any behavior change.

---

## 1. New i18n keys

The following keys MUST be added to `src/i18n/en.ts` under the `sort` namespace. All existing keys (`asc`, `desc`, `clear`) are preserved unchanged.

```
sort.title      — "Sort"         (inactive button label and modal header)
sort.noField    — "Select a field to sort"   (right-panel empty state)
```

All existing locales (`es`, etc.) MUST add the same keys. If a locale file does not define them, the system MUST fall back to the English value without throwing.

---

## 2. `fv-sort-button` — new internal component

### Identity
- Custom element tag: `fv-sort-button`
- File: `src/components/fv-sort-button.ts`
- NOT exported from the public barrel (`src/index.ts`). Internal use only.
- NOT part of the public API. Consumers MUST NOT use it directly.

### API — attributes / properties
| Name | Type | Default | Description |
|---|---|---|---|
| `field` | `string` | `''` | Data field key |
| `direction` | `'asc' \| 'desc'` | `'asc'` | Sort direction this button represents |
| `active` | `boolean` | `false` | Whether this direction is currently active |
| `for` | `string \| undefined` | `undefined` | `id` of the target `fv-view` element |
| `label` | `string` | `''` | Display name override. Falls back to title-case of `field`. |

### Behavior
This component MUST behave identically to the CURRENT `fv-sort-action` before this change:
- Renders a chip with a main button and an optional × clear button (visible only when `active`).
- Main button label: `"<displayName> - <direction label>"`.
- Clicking the main button while inactive: activates with current `direction`, dispatches `sort-change`.
- Clicking the main button while active: flips direction, dispatches `sort-change`.
- Clicking × clear: sets `active = false`, dispatches `sort-change` with `direction: null`. Focus returns to main button.
- When `for` is set: connects to the target `fv-view`, reads initial sort, subscribes to `fv-sort-change` events to stay in sync.

### Events
| Name | Detail type | Bubbles | Composed |
|---|---|---|---|
| `sort-change` | `SortChangeDetail` | `true` | `true` |

The event is also dispatched directly on the connected view element (non-bubbling, non-composed) when a `for` target is resolved.

---

## 3. `fv-sort-modal` — new component

### Identity
- Custom element tag: `fv-sort-modal`
- File: `src/components/fv-sort-modal.ts`
- NOT exported from the public barrel. Used only by `fv-sort-action`.

### API — properties (no reflected attributes)
| Name | Type | Default | Description |
|---|---|---|---|
| `registerOrder` | `Array<{field: string, title: string}>` | `[]` | Sortable fields list |
| `activeField` | `string \| null` | `null` | Currently active sort field (drives `aria-pressed` in left panel) |
| `activeDirection` | `'asc' \| 'desc' \| null` | `null` | Currently active sort direction (drives `aria-pressed` in right panel) |
| `open` | `boolean` | `false` | Controls visibility |

### Layout
The modal body is a two-column flex container:

```
┌──────────────────────────────────────────────────┐
│  Header: t().sort.title                     [✕]  │
├────────────────────┬─────────────────────────────┤
│  Left panel        │  Right panel                │
│  (scrollable)      │                             │
│  • Field A  ◀ sel  │  ↑ Ascending  [active?]     │
│  • Field B         │  ↓ Descending [active?]     │
│  • Field C         │                             │
│                    │  (empty state when no field) │
└────────────────────┴─────────────────────────────┘
```

- Left panel and right panel are separated by a 1px vertical border using `--fv-border`.
- Left panel width: `min(160px, 45%)`.
- Right panel: fills remaining width.
- Modal overall width: `min(420px, 90vw)`. Max height: `min(400px, 80vh)`.
- Shell (backdrop, modal card, header, close button) MUST match `fv-filter-modal` styling exactly.

### Left panel
- Renders one button per entry in `registerOrder`.
- Each button: `aria-pressed="true"` when its `field` equals `activeField`.
- Clicking a field button: sets that field as the locally selected field. Does NOT emit yet. Right panel updates immediately.
- If clicked field is already `activeField` AND no direction is active yet (first selection after clear), right panel just shows the direction buttons.

### Right panel
- When no field is locally selected: renders `<p class="empty">${t().sort.noField}</p>`.
- When a field is locally selected: renders two buttons:
  - `↑ ${t().sort.asc}` with `aria-pressed="true"` when `activeField === selectedField && activeDirection === 'asc'`.
  - `↓ ${t().sort.desc}` with `aria-pressed="true"` when `activeField === selectedField && activeDirection === 'desc'`.
  - Icon rendered via `getFlexiConfig().icons.sortAsc` / `icons.sortDesc` (same pattern as current `fv-sort-action`). Falls back to `↑` / `↓` text if icon is absent.
- Clicking a direction button when `aria-pressed` is `false`: emits `sort-change` with `{ field: selectedField, direction: 'asc'|'desc' }`, emits `modal-close`, closes.
- Clicking a direction button when `aria-pressed` is `true` (toggle-to-clear): emits `sort-change` with `{ field: selectedField, direction: null }`, emits `modal-close`, closes.

### Close triggers
The modal closes (emitting `modal-close`) when:
- The backdrop is clicked.
- The header × button is clicked.
- `Escape` key is pressed.
- A direction is selected (or cleared via toggle).

### Events
| Name | Detail type | Bubbles | Composed |
|---|---|---|---|
| `sort-change` | `SortChangeDetail` | `true` | `true` |
| `modal-close` | `void` | `true` | `true` |

### Keyboard navigation
- When modal opens: focus lands on the first field button in the left panel.
- `ArrowDown` / `ArrowUp` within left panel: move focus between field buttons.
- `Tab` from the last left-panel button: moves focus to the first direction button in the right panel (if rendered).
- `Tab` from the last right-panel button: moves focus to the close button in the header.
- `Enter` / `Space` on any button: triggers its click action.
- `Escape` anywhere: closes modal.

---

## 4. `fv-sort-action` — redesigned

### Identity
- Custom element tag: `fv-sort-action` (unchanged)
- File: `src/components/fv-sort-action.ts` (rewritten)
- MUST remain exported from the public barrel.

### API — attributes / properties
| Name | Attr form | Type | Default | Description |
|---|---|---|---|---|
| `for` | `for` | `string \| undefined` | `undefined` | `id` of the target `fv-view` |
| `registerOrder` | `register-order` (JSON) | `Array<{field: string, title: string}>` | `[]` | Sortable fields and their display titles |
| `storage-key` | `storage-key` | `string \| undefined` | `undefined` | Enables localStorage persistence |
| `sync-url` | `sync-url` (boolean attr) | `boolean` | `false` | Enables URL hash persistence |

`registerOrder` MUST be settable as:
1. A JavaScript property (array assigned directly).
2. A JSON string via the `register-order` attribute. If the JSON is invalid, the component MUST log `[fv-sort-action] Invalid register-order JSON` to the console and use `[]`.

### Internal state
- `_currentField: string | null` — the active sort field.
- `_currentDirection: 'asc' | 'desc' | null` — the active sort direction.
- `_modalOpen: boolean` — controls `fv-sort-modal`.
- `_selectedField: string | null` — the field highlighted in the modal (passed to modal as `activeField`). Initialized to `_currentField` when modal opens.

### Button rendering
- **Inactive** (`_currentField === null`): renders chip with label `t().sort.title` (fallback `"Sort"`). `aria-pressed="false"`. No × clear button.
- **Active** (`_currentField !== null`): renders chip with label `"<title> - <dirLabel>"` where `title` is the `title` from `registerOrder` for that field, and `dirLabel` is `t().sort.asc` or `t().sort.desc`. `aria-pressed="true"`. Renders × clear button.
- CSS: identical chip structure to `fv-filter-action` (same `.chip`, `.main`, `.clear` classes and CSS variables).

### Persistence — hydration order (on `_connect()`)
Priority from highest to lowest:

1. URL hash: if `sync-url` is set and `fv-sort=field:direction` is present in `location.hash`, parse it. Use this value.
2. localStorage: if `storage-key` is set and key `{storage-key}-sort` exists, parse `{ field, direction }` from JSON. Use this if URL source was absent.
3. Connected view: read `(target as any).currentSort` from the resolved `fv-view`. Use this if neither persistence source had data.

After hydration, the component MUST dispatch `sort-change` to the connected view to apply the persisted state (so the view reflects the loaded sort without user interaction).

### Persistence — write-back
On every `sort-change` emission:
- If `storage-key` is set: write `JSON.stringify({ field, direction })` to `localStorage.setItem('{storage-key}-sort', ...)`. On clear, write `JSON.stringify({ field: null, direction: null })`.
- If `sync-url` is set and sort is active: update `location.hash` by setting/replacing `fv-sort=field:direction`.
- If `sync-url` is set and sort is cleared: remove `fv-sort=...` from `location.hash`.

### Inbound sync
Subscribe to `fv-sort-change` on the connected view (same as current `fv-sort-action`). On receiving a `fv-sort-change` event from the target view, update `_currentField` and `_currentDirection` and trigger re-render. Also write-back to persistence.

### Events
| Name | Detail type | Bubbles | Composed |
|---|---|---|---|
| `sort-change` | `SortChangeDetail` | `true` | `true` |

The event is also dispatched directly on the connected view element (non-bubbling, non-composed).

### Clear button behavior
- Clicking ×: sets `_currentField = null`, `_currentDirection = null`, dispatches `sort-change` with `{ field: '', direction: null }`.

  > Note: `field` in the clear payload MUST be an empty string `''` (not the cleared field name), to match the contract `fv-view` uses to reset sort state.

- Focus returns to the main button after clear.

---

## 5. `fv-header-menu` — updated consumer

### Change
Lines using `<fv-sort-action field=... direction=... active=...>` MUST be replaced with `<fv-sort-button field=... direction=... active=...>`. All other behavior is unchanged.

### Import
`fv-header-menu.ts` MUST import `./fv-sort-button.js` instead of (or in addition to) `./fv-sort-action.js`. The `./fv-sort-action.js` import in `fv-header-menu.ts` MUST be removed or replaced.

### Contract
`fv-header-menu` MUST continue emitting `sort-change` events with the same `SortChangeDetail` shape. No changes to its public API or event contract.

---

## 6. Storage key contract

### localStorage
- Key written by `fv-sort-action`: `{storage-key}-sort` (e.g. if `storage-key="my-table"`, key is `"my-table-sort"`).
- Key written by `fv-view` for sort: `{storageKey}-sort` (same pattern, same suffix).
- **Collision rule**: if `fv-sort-action` and `fv-view` share the same `storage-key` value and both have sort persistence enabled, they share the same key. Last-writer-wins. This is intentional and MUST be documented in the component's JSDoc.

### URL hash
- Parameter name: `fv-sort` (same as `fv-view`).
- **Collision rule**: if both `fv-view` (with its own `sync-url`) and `fv-sort-action` (with `sync-url`) write `fv-sort` to the hash, last-writer-wins. Consumers MUST NOT enable `sync-url` on both simultaneously. This MUST be documented in the component's JSDoc.
- Hash format: `fv-sort=field:direction` (colon-delimited, no spaces). Example: `fv-sort=name:asc`.

---

## 7. `SortChangeDetail` — unchanged

```typescript
// src/types.ts — no change required
type SortChangeDetail = { field: string; direction: 'asc' | 'desc' | null };
```

---

## 8. Public barrel exports

- `fv-sort-action`: MUST remain exported.
- `fv-sort-button`: MUST NOT be added to the public barrel.
- `fv-sort-modal`: MUST NOT be added to the public barrel.

---

## 9. Acceptance scenarios

### Scenario 1 — Inactive button label
```gherkin
Given fv-sort-action has registerOrder with two fields
  And no sort is active
When the component renders
Then the main button shows t().sort.title ("Sort")
  And aria-pressed is "false"
  And no × clear button is visible
```

### Scenario 2 — Selecting a field and direction via modal
```gherkin
Given fv-sort-action has registerOrder: [{field:"name", title:"Name"}, {field:"age", title:"Age"}]
  And no sort is active
When the user clicks the main "Sort" button
Then fv-sort-modal opens with open=true
  And the left panel shows "Name" and "Age" buttons
  And the right panel shows the empty state t().sort.noField

When the user clicks "Name" in the left panel
Then the right panel shows ↑ Ascending and ↓ Descending buttons
  And neither direction button has aria-pressed="true"

When the user clicks "↓ Descending"
Then fv-sort-modal closes
  And fv-sort-action dispatches sort-change with {field:"name", direction:"desc"}
  And the main chip label becomes "Name - Descending"
  And aria-pressed is "true"
  And a × clear button appears
```

### Scenario 3 — Toggle-to-clear inside modal
```gherkin
Given fv-sort-action has active sort {field:"name", direction:"desc"}
When the user clicks the main chip button
Then fv-sort-modal opens
  And "Name" is aria-pressed="true" in the left panel
  And "↓ Descending" is aria-pressed="true" in the right panel

When the user clicks "↓ Descending" (already pressed)
Then fv-sort-modal closes
  And fv-sort-action dispatches sort-change with {field:"name", direction:null}
  And the chip reverts to inactive state showing "Sort"
```

### Scenario 4 — × clear button
```gherkin
Given fv-sort-action has active sort {field:"age", direction:"asc"}
When the user clicks the × button
Then sort-change is dispatched with {field:"", direction:null}
  And the chip shows "Sort" (inactive)
  And focus returns to the main button
```

### Scenario 5 — Modal closes on Escape
```gherkin
Given fv-sort-modal is open
When the user presses Escape
Then modal-close is emitted
  And the modal is no longer visible
  And focus returns to the main chip button in fv-sort-action
```

### Scenario 6 — Modal closes on backdrop click
```gherkin
Given fv-sort-modal is open
When the user clicks the backdrop (outside the modal card)
Then modal-close is emitted
  And the modal is no longer visible
```

### Scenario 7 — Persistence: localStorage hydration
```gherkin
Given storage-key="demo" is set on fv-sort-action
  And localStorage key "demo-sort" contains {"field":"name","direction":"asc"}
  And no fv-sort parameter is in the URL hash
When fv-sort-action connects and resolves its fv-view target
Then _currentField is "name" and _currentDirection is "asc"
  And sort-change is dispatched to the target view with {field:"name", direction:"asc"}
```

### Scenario 8 — Persistence: URL takes priority over localStorage
```gherkin
Given storage-key="demo" and sync-url are both set
  And localStorage "demo-sort" contains {"field":"age","direction":"desc"}
  And URL hash contains "fv-sort=name:asc"
When fv-sort-action connects
Then _currentField is "name" and _currentDirection is "asc"
  (URL value wins over localStorage)
```

### Scenario 9 — Persistence: write-back on sort change
```gherkin
Given storage-key="demo" and sync-url are both set
  And active sort is {field:"name", direction:"asc"}
When the user applies a new sort {field:"age", direction:"desc"} via modal
Then localStorage "demo-sort" is updated to {"field":"age","direction":"desc"}
  And URL hash is updated to contain "fv-sort=age:desc"
```

### Scenario 10 — Inbound sync from fv-view
```gherkin
Given fv-sort-action is connected to fv-view via for="my-view"
  And no sort is active in fv-sort-action
When fv-view emits fv-sort-change with {field:"name", direction:"asc"}
Then fv-sort-action updates _currentField to "name" and _currentDirection to "asc"
  And the chip label updates to "Name - Ascending"
```

### Scenario 11 — Invalid registerOrder JSON attribute
```gherkin
Given register-order attribute is set to "not valid json"
When fv-sort-action initializes
Then a console warning "[fv-sort-action] Invalid register-order JSON" is logged
  And registerOrder defaults to []
  And the modal left panel shows an empty list (no error thrown)
```

### Scenario 12 — fv-header-menu backward compatibility
```gherkin
Given fv-header-menu is rendered with a column where field="name"
  And currentSort is {field:"name", direction:"asc"}
When the menu is opened
Then two fv-sort-button elements are rendered
  And the "asc" fv-sort-button has active=true
  And the "desc" fv-sort-button has active=false

When the user clicks the "desc" fv-sort-button
Then fv-header-menu emits sort-change with {field:"name", direction:"desc"}
  And the menu closes
```

### Scenario 13 — Keyboard navigation in modal
```gherkin
Given fv-sort-modal is open with two fields in registerOrder
When the modal opens
Then focus is on the first field button

When the user presses ArrowDown
Then focus moves to the second field button

When the user presses Tab while on the second field button
  And a field has been selected (right panel is visible)
Then focus moves to the first direction button (Ascending)

When the user presses Escape
Then the modal closes
```

### Scenario 14 — No fv-view target found
```gherkin
Given fv-sort-action has for="nonexistent-id"
When the component connects
Then a console warning "[fv-sort-action] Could not find element with id 'nonexistent-id'" is logged
  And the component still renders normally
  And clicking the chip still opens the modal
  And sort-change events still bubble (no target dispatch)
```

---

## 10. Migration note

**Before** (N chips per sortable field):
```html
<fv-sort-action for="v" field="name" label="Name"></fv-sort-action>
<fv-sort-action for="v" field="age" label="Age"></fv-sort-action>
```

**After** (one modal trigger):
```html
<fv-sort-action
  for="v"
  storage-key="my-table"
  sync-url
></fv-sort-action>
```
```js
document.querySelector('fv-sort-action').registerOrder = [
  { field: 'name', title: 'Name' },
  { field: 'age', title: 'Age' },
];
```

No changes to event consumers or `fv-view` configuration.

---

## 11. Files affected

| File | Change |
|---|---|
| `src/components/fv-sort-action.ts` | Full rewrite |
| `src/components/fv-sort-button.ts` | New file (internal) |
| `src/components/fv-sort-modal.ts` | New file (internal) |
| `src/components/fv-header-menu.ts` | Replace `fv-sort-action` usage with `fv-sort-button` |
| `src/i18n/en.ts` | Add `sort.title` and `sort.noField` |
| `src/i18n/*.ts` | Add same keys in all locale files |
| `src/index.ts` | No change (fv-sort-action already exported; new internals not exported) |
| `src/types.ts` | No change |
