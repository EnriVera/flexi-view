# Proposal: redesign-sort-action

## Intent

Rework `<fv-sort-action>` from a single toggle button into a two-element control that separates the concepts of **activating/cycling direction** from **clearing the sort**.

### Problem

Today the component is a single `<button>` whose click handler toggles `active` on/off. This conflates three distinct user intents into one click:

1. "I want to sort by this field" (activate)
2. "I want to flip the direction" (cycle asc/desc)
3. "I want to remove this sort" (clear)

Because `direction` is fixed per instance, end users cannot flip asc/desc from the same chip — they have to remove the sort and re-activate it from another control. And because activation and clearing share the same click target, the affordance is ambiguous: a pressed button that means "click again to remove" is not discoverable.

### Why now

The sorting UX is being polished as part of the v1 surface. Other view-bound controls (filters, switcher) already use explicit affordances; `fv-sort-action` is the last control still relying on an implicit toggle. Fixing it now keeps the public API stable before v1 lock-in.

### Success criteria

- A user can activate a sort with a single click (defaulting to `asc`).
- A user can flip the direction without clearing first (one click on the active main button).
- A user can clear the sort with an explicit, visible affordance (`×` button), only present while active.
- Existing integrations (`for="<view-id>"`, `sort-change` event, external `fv-sort-change` sync) keep working with no breaking change to consumers.

## Scope

### In scope

- Rendering: replace single `<button>` with a container holding a main button + a clear button.
- Interaction: click logic for the main button changes from `toggle active` to `activate-or-cycle-direction`.
- Visibility: clear button is rendered only while `active === true`.
- Event semantics: keep emitting `sort-change` (and forwarding to target view) with the same `SortChangeDetail` shape — only the `direction` value emitted per click changes.
- Accessibility: `aria-pressed` on the main button, `aria-label` on the clear button, and a sensible title/tooltip pair.
- Styling: keep `--fv-*` token-based theming; introduce minimal styles for the new layout (group + clear button).

### Out of scope

- Multi-field / composite sort (one chip = one field, still).
- Persisting a per-instance "preferred default direction" beyond the existing `direction` property.
- Changing the `for=`/target-discovery mechanism or the public event names.
- Updating consumers that render their own sort UI (they remain free to ignore this control).
- i18n key restructuring beyond adding a clear/remove label if missing.

## Approach

### Structural change

`render()` returns a wrapper element containing:

1. **Main button** — shows the field label (or icon) and the current direction icon. `aria-pressed` reflects `active`.
2. **Clear button** — rendered conditionally when `active`. Shows `×`, has its own click handler.

Both live inside the same shadow root; the wrapper handles layout (flex row, no gap collapse) and shares the existing border/radius look so the pair reads as a single chip.

### Interaction model

Main button click (`_onActivateOrCycle`):

- If `!active` → emit `sort-change` with `direction: this.direction` (defaulting to `'asc'` if unset). Optimistically set `active = true`.
- If `active`  → flip `this.direction` (`asc` ↔ `desc`) and emit `sort-change` with the new direction.

Clear button click (`_onClear`):

- Emit `sort-change` with `direction: null`. Optimistically set `active = false`.

The existing inbound subscription to `fv-sort-change` from the target view stays as the source of truth: it already reconciles `active` and `direction` whenever the view broadcasts authoritative state, so optimistic updates self-correct.

### Event contract

Unchanged. `SortChangeDetail` still carries `{ field, direction: 'asc' | 'desc' | null }`. Listeners that today react to "active off" via `direction: null` keep working — only the *trigger* moves from the main button to the clear button.

### Accessibility and i18n

- Main button: `aria-pressed`, `title` = current direction label (`t().sort.asc | desc`).
- Clear button: `aria-label` from a new/reused i18n key (e.g. `t().sort.clear`), with a fallback string if the key is missing.
- Clear button is keyboard-focusable only while rendered (natural DOM behavior, no `tabindex` tricks).

### Styling

- Wrapper: `display: inline-flex; align-items: stretch;` with shared border so the two buttons look unified.
- Clear button: smaller padding, no left border (or a thin separator) to avoid double-border seams.
- Reuse existing tokens (`--fv-border`, `--fv-accent`, `--fv-row-hover`, `--fv-text-muted`).

## Risks and considerations

- **Visual regression**: any consumer styling `fv-sort-action button` from light DOM is already blocked by Shadow DOM, so risk is low — but consumers theming via host attributes should be re-checked.
- **Event duplication**: cycling direction now fires `sort-change` while `active` is already true. Views must accept consecutive non-null events with the same field — need to confirm `fv-view`'s sort handler treats this as an update, not a no-op. Spec phase to verify.
- **Default direction semantics**: today `direction` is a public property; we will continue to honor it as the *initial* direction on first activation. After the first cycle the value mutates locally — document this so consumers don't rely on `direction` as read-only.
- **A11y of conditional clear button**: focus management when the clear button disappears (e.g., user clears via keyboard) — focus should fall back to the main button. Worth a small explicit handler.
- **Test coverage**: existing tests assume single-button toggle semantics; they will need rework. Flag for the tasks phase.

## Open questions (for spec/design)

- Should the clear button animate in/out, or appear instantly? (Lean: instant; animations are out of scope for v1 polish.)
- Do we expose a `defaultDirection` property separate from `direction` to keep "initial" vs "current" distinct, or keep mutating `direction` in place? (Lean: keep mutating, document it.)
- Should the main button's label include the field name, or stay icon+direction-only as today? (Lean: keep current content; field name is a separate enhancement.)
