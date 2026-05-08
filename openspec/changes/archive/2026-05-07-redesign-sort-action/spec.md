# Spec: redesign-sort-action

**Component**: `fv-sort-action` (`src/components/fv-sort-action.ts`)
**Status**: spec
**Date**: 2026-05-07

---

## Delta Requirements

These requirements describe what MUST be true after the change is applied. They do not prescribe implementation.

---

### REQ-1 — Structural layout

**REQ-1.1** The shadow DOM MUST contain a single wrapper element that holds exactly two interactive elements: a main button and a clear button.

**REQ-1.2** The wrapper MUST use `display: inline-flex` so that both buttons form a visually unified chip.

**REQ-1.3** The main button MUST always be present in the DOM, regardless of `active` state.

**REQ-1.4** The clear button MUST only be present in the DOM when `active === true`. It MUST be absent (not hidden) when `active === false`.

---

### REQ-2 — Main button behavior

**REQ-2.1** When `active === false` and the main button is clicked, the component MUST dispatch a `sort-change` event with `direction` equal to the current `direction` property value (default: `'asc'`).

**REQ-2.2** When `active === false` and the main button is clicked, the component MUST set `active = true` optimistically (without waiting for the view response).

**REQ-2.3** When `active === true` and the main button is clicked, the component MUST flip `direction` from `'asc'` to `'desc'` or from `'desc'` to `'asc'`.

**REQ-2.4** When `active === true` and the main button is clicked, the component MUST dispatch a `sort-change` event with the NEW (flipped) `direction` value.

**REQ-2.5** When `active === true` and the main button is clicked, `active` MUST remain `true` — the main button MUST NOT clear the sort.

**REQ-2.6** The main button MUST have `aria-pressed` set to `"true"` when `active === true` and `"false"` when `active === false`.

---

### REQ-3 — Clear button behavior

**REQ-3.1** When the clear button is clicked, the component MUST dispatch a `sort-change` event with `direction: null` and `field` equal to the component's `field` property.

**REQ-3.2** When the clear button is clicked, the component MUST set `active = false` optimistically.

**REQ-3.3** After the clear button is clicked, the clear button MUST be removed from the DOM (consequence of `active = false` and REQ-1.4).

**REQ-3.4** When the clear button is removed from the DOM (e.g., after keyboard activation), focus MUST move to the main button.

---

### REQ-4 — Event contract

**REQ-4.1** The `sort-change` event shape MUST remain unchanged: `CustomEvent<SortChangeDetail>` where `SortChangeDetail = { field: string; direction: 'asc' | 'desc' | null }`.

**REQ-4.2** `sort-change` MUST bubble and be composed (shadow DOM crossing) when dispatched from the component host.

**REQ-4.3** When `for` is set and a target view element exists, the component MUST also forward a `sort-change` event directly to that element (non-bubbling, non-composed), preserving the same `detail`.

**REQ-4.4** The external sync mechanism — subscribing to `fv-sort-change` from the target view — MUST remain the authoritative reconciliation source. Optimistic updates (REQ-2.2, REQ-3.2) MUST be self-correctable by incoming `fv-sort-change` events.

**REQ-4.5** Consecutive `sort-change` events with the same `field` and a non-null `direction` (direction flip) MUST be dispatched and MUST NOT be coalesced or suppressed.

---

### REQ-5 — Accessibility

**REQ-5.1** The main button MUST have `aria-pressed` reflecting the current `active` state (see REQ-2.6).

**REQ-5.2** The main button MUST have a `title` attribute equal to the current direction label (`t().sort.asc` or `t().sort.desc`).

**REQ-5.3** The clear button MUST have `aria-label` equal to `t().sort.clear` (see REQ-6.1).

**REQ-5.4** The clear button MUST be keyboard-focusable whenever it is present in the DOM. No explicit `tabindex` manipulation is required; natural DOM focus order is sufficient.

**REQ-5.5** The clear button MUST NOT receive focus when it is absent from the DOM.

---

### REQ-6 — i18n

**REQ-6.1** The `sort` namespace in both `en.ts` and `es.ts` MUST include a `clear` key.

- English: `clear: 'Clear sort'`
- Spanish: `clear: 'Quitar orden'` (ADR-4: chosen over the initial proposal of `'Limpiar orden'` to avoid conflict with the existing `filter.clear` label)

**REQ-6.2** The `Translations` type (inferred from `en.ts`) MUST reflect the new `sort.clear` key. Both locale files MUST satisfy `Translations` without compile errors.

**REQ-6.3** Existing keys `sort.asc` and `sort.desc` MUST remain unchanged.

---

### REQ-7 — Styling

**REQ-7.1** The wrapper element MUST use `display: inline-flex` and `align-items: stretch` so both buttons share the same height.

**REQ-7.2** The main button and clear button MUST share a unified visual boundary (border/background) so they read as a single chip.

**REQ-7.3** The clear button MUST use existing CSS custom properties (`--fv-border`, `--fv-accent`, `--fv-row-hover`, `--fv-text-muted`) — no new tokens are introduced.

**REQ-7.4** There MUST NOT be a double-border seam between the main button and the clear button (e.g., use `border-left: none` or equivalent on the clear button).

**REQ-7.5** The active (pressed) state visual indicator on the main button MUST remain consistent with the current behavior: `background: var(--fv-accent)` and contrasting text when `aria-pressed="true"`.

---

### REQ-8 — Public API stability

**REQ-8.1** The public properties `field`, `direction`, `active`, and `for` MUST remain present and functionally unchanged in signature.

**REQ-8.2** The `direction` property MUST be treated as mutable: the component updates it in place when cycling. Consumers MUST NOT assume `direction` is read-only after the first activation.

**REQ-8.3** No new required properties or attributes are introduced. The component MUST remain usable with only `field` set (no `for`, no `direction` override).

---

## Acceptance Scenarios

### Scenario 1 — Activate sort (inactive → active)

```gherkin
Given fv-sort-action with field="name" direction="asc" active=false
When the user clicks the main button
Then a sort-change event is dispatched with { field: "name", direction: "asc" }
And active becomes true
And the clear button appears in the DOM
And the main button has aria-pressed="true"
```

### Scenario 2 — Activate sort with default direction

```gherkin
Given fv-sort-action with field="name" and no direction attribute
When the user clicks the main button
Then a sort-change event is dispatched with { field: "name", direction: "asc" }
```

### Scenario 3 — Cycle direction (active asc → desc)

```gherkin
Given fv-sort-action with field="name" active=true direction="asc"
When the user clicks the main button
Then direction becomes "desc"
And a sort-change event is dispatched with { field: "name", direction: "desc" }
And active remains true
And the clear button remains in the DOM
```

### Scenario 4 — Cycle direction (active desc → asc)

```gherkin
Given fv-sort-action with field="name" active=true direction="desc"
When the user clicks the main button
Then direction becomes "asc"
And a sort-change event is dispatched with { field: "name", direction: "asc" }
And active remains true
```

### Scenario 5 — Clear sort

```gherkin
Given fv-sort-action with field="name" active=true direction="desc"
When the user clicks the clear button
Then a sort-change event is dispatched with { field: "name", direction: null }
And active becomes false
And the clear button is removed from the DOM
And the main button has aria-pressed="false"
```

### Scenario 6 — Clear button focus recovery

```gherkin
Given fv-sort-action with field="name" active=true
And the clear button is focused
When the user activates the clear button via keyboard (Enter or Space)
Then a sort-change event is dispatched with { field: "name", direction: null }
And active becomes false
And focus moves to the main button
```

### Scenario 7 — External view sync overrides optimistic state

```gherkin
Given fv-sort-action with for="my-view" field="name" active=true direction="asc"
When the target view dispatches fv-sort-change with { field: "age", direction: "desc" }
Then active becomes false (this field is no longer sorted)
And the clear button is removed from the DOM
```

### Scenario 8 — External view sync confirms direction flip

```gherkin
Given fv-sort-action with for="my-view" field="name" active=true direction="asc"
When the target view dispatches fv-sort-change with { field: "name", direction: "desc" }
Then active remains true
And direction becomes "desc"
```

### Scenario 9 — Clear button absent when inactive

```gherkin
Given fv-sort-action with active=false
Then the clear button is NOT present in the DOM
And the clear button cannot receive keyboard focus
```

### Scenario 10 — i18n clear label

```gherkin
Given fv-sort-action with active=true and language configured to "en"
Then the clear button has aria-label="Clear sort"

Given fv-sort-action with active=true and language configured to "es"
Then the clear button has aria-label="Quitar orden"
```

### Scenario 11 — Forwarding to target view

```gherkin
Given fv-sort-action with for="my-view" field="name" active=false
And the element with id="my-view" exists in the document
When the user clicks the main button
Then a sort-change event is dispatched from the component host (bubbles: true)
And a separate sort-change event is dispatched directly on the target element (bubbles: false)
Both events carry { field: "name", direction: "asc" }
```

### Scenario 12 — Consecutive direction events are not suppressed

```gherkin
Given fv-sort-action with field="name" active=true direction="asc"
When the user clicks the main button (→ dispatches direction: "desc")
And the user clicks the main button again (→ dispatches direction: "asc")
Then two separate sort-change events are dispatched
And neither is suppressed or coalesced
```

---

## Out of Scope (confirmed from proposal)

- Multi-field / composite sort
- Persisting a separate "preferred default direction" property
- Changing the `for=` discovery mechanism or event names
- Animation for clear button appearance/disappearance
- A separate `defaultDirection` property (mutating `direction` in place is the accepted behavior)
