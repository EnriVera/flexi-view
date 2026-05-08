# Design: redesign-sort-action

## Architecture summary

`<fv-sort-action>` becomes a **two-button compound chip** rendered in a single shadow root: a main button (activate / cycle) and a conditionally-rendered clear button (`×`). Visually they share a border so the pair reads as one chip; semantically they are independent click targets with separate handlers. The component remains a **dumb optimistic emitter** — it dispatches `sort-change` and trusts the inbound `fv-sort-change` subscription to reconcile authoritative state.

No event-contract or public-API change. The redesign is purely internal: template shape, click logic, and styling.

## Component anatomy

```
fv-sort-action (host: inline-block)
└── div.chip               ← wrapper, owns the unified border + radius
    ├── button.main        ← activate or cycle (always present)
    │   ├── icon (sortAsc | sortDesc)
    │   └── span.label     ← direction label
    └── button.clear       ← conditional: only when active === true
        └── × glyph
```

The wrapper `div.chip` owns the visual border; the two child buttons are border-less internally with a thin separator between them. This avoids the double-border seam problem of stitching two independently-bordered buttons together.

## HTML template (exact)

```ts
render() {
  const icons = getFlexiConfig().icons;
  const icon = this.direction === 'asc' ? icons.sortAsc : icons.sortDesc;
  const safeIcon = icon || '<span>↕</span>';
  const dirLabel = this.direction === 'asc' ? t().sort.asc : t().sort.desc;
  const clearLabel = t().sort.clear ?? 'Clear sort';

  return html`
    <div class="chip" part="chip">
      <button
        class="main"
        part="main"
        aria-pressed=${String(this.active)}
        title=${dirLabel}
        @click=${this._onActivateOrCycle}
      >
        ${unsafeHTML(safeIcon)}
        <span class="label">${dirLabel}</span>
      </button>
      ${this.active ? html`
        <button
          class="clear"
          part="clear"
          aria-label=${clearLabel}
          title=${clearLabel}
          @click=${this._onClear}
        >×</button>
      ` : ''}
    </div>
  `;
}
```

Notes:
- `part="chip|main|clear"` exposes hooks for downstream theming via `::part()` without breaking Shadow DOM encapsulation. Cheap to add now, painful to retrofit later.
- Conditional rendering of `.clear` (vs. `hidden` attribute) keeps the DOM small and keeps focus order natural — when it disappears, focus management has a single deterministic target (see Focus management below).

## Click handlers (exact logic)

```ts
private _onActivateOrCycle = () => {
  let nextDirection: 'asc' | 'desc';
  if (!this.active) {
    // First activation — honor the configured direction (default 'asc')
    nextDirection = this.direction ?? 'asc';
  } else {
    // Already active — flip direction
    nextDirection = this.direction === 'asc' ? 'desc' : 'asc';
    this.direction = nextDirection;  // mutate local state for next render
  }
  this.active = true;  // optimistic
  this._emit({ field: this.field, direction: nextDirection });
};

private _onClear = () => {
  this.active = false;  // optimistic
  this._emit({ field: this.field, direction: null });
  // Move focus back to main button so keyboard users don't lose context
  this.updateComplete.then(() => {
    const main = this.renderRoot.querySelector<HTMLButtonElement>('button.main');
    main?.focus();
  });
};

private _emit(detail: SortChangeDetail) {
  this.dispatchEvent(new CustomEvent<SortChangeDetail>('sort-change', {
    detail, bubbles: true, composed: true,
  }));
  if (this._target) {
    this._target.dispatchEvent(new CustomEvent<SortChangeDetail>('sort-change', {
      detail, bubbles: false, composed: false,
    }));
  }
}
```

Decision points:

- **When does `direction` mutate?** Only on cycle (active → active flip), never on first activation or on clear. This means the `direction` property acts as the *initial* preferred direction until the user interacts; afterwards it tracks the live state. Documented in JSDoc on the property.
- **Optimistic updates** are kept. The inbound `_onSortChangeFromView` listener already reconciles authoritative state from the view, so any divergence self-corrects on the next round-trip.
- **Single emit per click**, identical detail shape to today.

## CSS (exact)

```css
:host { display: inline-block; }

.chip {
  display: inline-flex;
  align-items: stretch;
  border: 1px solid var(--fv-border, #e0e0e0);
  border-radius: 4px;
  overflow: hidden;          /* clips inner button hover backgrounds to chip radius */
  background: var(--fv-bg, transparent);
}

button {
  background: none;
  border: none;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 12px;
  color: var(--fv-text, #333);
  font: inherit;
}

button.main {
  display: flex;
  align-items: center;
  gap: 6px;
}

.label { font-size: 12px; font-weight: 500; }

button.main[aria-pressed='true'] {
  background: var(--fv-accent, #111);
  color: #fff;
}

button.main:hover { background: var(--fv-row-hover, #f5f5f5); }
button.main[aria-pressed='true']:hover { background: var(--fv-text-muted, #666); }

button.clear {
  border-left: 1px solid var(--fv-border, #e0e0e0);
  padding: 4px 8px;
  line-height: 1;
  font-size: 14px;
  color: var(--fv-text-muted, #666);
}

button.clear:hover {
  background: var(--fv-row-hover, #f5f5f5);
  color: var(--fv-text, #333);
}

/* When main is pressed, the clear separator should match the accent edge */
button.main[aria-pressed='true'] + button.clear {
  border-left-color: var(--fv-accent, #111);
}

button:focus-visible {
  outline: 2px solid var(--fv-accent, #111);
  outline-offset: -2px;
}
```

Token reuse only — no new CSS variables introduced.

## i18n

A new key `sort.clear` is required. The chosen message is the action verb, not the state, to match how `aria-label` is read by screen readers.

### `src/i18n/en.ts`

```ts
sort: {
  asc: 'Ascending',
  desc: 'Descending',
  clear: 'Clear sort',
},
```

### `src/i18n/es.ts`

```ts
sort: {
  asc: 'Ascendente',
  desc: 'Descendente',
  clear: 'Quitar orden',
},
```

Because `Translations` is `typeof en`, adding the key to `en.ts` enforces it in `es.ts` at compile time. The component still reads via `t().sort.clear ?? 'Clear sort'` defensively in case a downstream override drops the key.

## Focus management

When the user clicks the clear button:

1. The component sets `active = false` optimistically.
2. The next render removes the clear button from the DOM.
3. The handler awaits `updateComplete` and explicitly focuses `button.main` inside the same shadow root.

This keeps keyboard users anchored on the chip instead of losing focus to `<body>`. We do NOT use `tabindex` tricks — both buttons are natively focusable, the clear button only exists while it's a meaningful target.

When the user activates via keyboard (Enter/Space on main while inactive), the clear button mounts after render. We do NOT auto-focus the clear button — the user expects to stay on the activator they just pressed; they can Tab forward to reach the clear button.

## fv-view risk confirmation

Confirmed: **no change needed in `fv-view`**.

`_onSortChange` (`src/components/fv-view.ts:151–165`) handles consecutive non-null events on the same field correctly:

```ts
if (detail.direction === null) { ... } else {
  this._sortConfig = detail;          // fresh assignment → reactive
  if (this.syncUrl) writeSortToUrl(detail.field, detail.direction);
}
this._emitStateEvent('fv-sort-change', this._sortConfig);
```

A cycle from `{field:'age', direction:'asc'}` to `{field:'age', direction:'desc'}`:

- Lit treats `_sortConfig` as a `@state()`; a new object reference triggers re-render.
- `applySort` is recomputed in the `_processedData` getter on the next render — it reads `direction` fresh, so the visual order updates.
- `fv-sort-change` is re-emitted, propagating the new direction back to all subscribed `fv-sort-action` instances.
- URL/storage writes are idempotent for the new value.

The proposal-flagged risk is therefore a non-issue. Logged as confirmed in the architecture decisions below so it doesn't get re-investigated in tasks.

## Test strategy

### Existing tests that must change

`src/__tests__/components/fv-sort-action.test.ts` — replace `_onClick` references with `_onActivateOrCycle` / `_onClear`. The single-handler model is gone.

| Existing test | Action |
|---|---|
| `dispatches sort-change with asc direction when direction is asc` | Rewrite: call `_onActivateOrCycle` from inactive state, assert `direction: 'asc'`. |
| `dispatches sort-change with desc direction when direction is desc` | Rewrite: same as above with `direction = 'desc'`. |
| `event bubbles and is composed` | Keep, retarget to `_onActivateOrCycle`. |
| `active prop defaults to false` | Keep as-is. |
| `dispatches sort-change on self AND on target when _onClick fires in external mode` | Rewrite: rename to `_onActivateOrCycle`, same assertions. |
| All other `for=`/external-mode tests | Keep — handler rename only. |
| `subscribeConfig fires requestUpdate` | Keep as-is. |

`src/__tests__/unit/sort-filter.test.ts` is unaffected (pure utility tests).

### New tests required

1. **Cycle direction**: from `active = true, direction = 'asc'`, calling `_onActivateOrCycle` emits `direction: 'desc'` and mutates `el.direction` to `'desc'`. A second call emits `'asc'` again.
2. **First activation honors property**: `active = false, direction = 'desc'` → `_onActivateOrCycle` emits `'desc'` (not `'asc'`); `direction` is NOT mutated on first activation.
3. **Default direction on first activation**: when `direction` is unset (defaults to `'asc'`), first activation emits `'asc'`.
4. **Clear emits null**: `active = true` → `_onClear` emits `{ field, direction: null }` and sets `active = false`.
5. **Clear forwards to target in external mode**: same as activate-target test but for `_onClear`.
6. **Clear button only renders when active**: assert `renderRoot.querySelector('button.clear')` is null when `active = false`, present when `active = true`.
7. **Focus returns to main after clear**: spy on `main.focus`, call `_onClear`, await `updateComplete`, assert focus called.
8. **i18n fallback**: when `t().sort.clear` is missing, the clear button still renders with the `'Clear sort'` fallback in `aria-label`.

Test harness stays the same (vitest + JSDOM stubs). No new dependencies.

## ADR-style decisions

### ADR-1: Two-button chip, conditional clear

**Decision**: Render two buttons inside a wrapper, conditionally render the clear button.

**Rationale**: Three intents (activate, cycle, clear) collapsed into one button forced ambiguous affordances. Splitting only activate/cycle from clear gives 2 controls instead of 3 because activate and cycle naturally share the same target ("press the chip again to flip"). The clear button is the *new* affordance the proposal demands.

**Rejected alternatives**:

- **Three buttons (asc / desc / clear)**: more explicit but visually heavy and breaks the "single chip" affordance. Cycle-on-press is a familiar idiom from sortable column headers.
- **Long-press or right-click for clear**: undiscoverable on touch; fails accessibility.
- **Hidden clear via `hidden` attribute instead of conditional render**: keeps DOM stable but complicates focus management (focus could land on a hidden control via Tab in some browsers). Conditional render is simpler.

### ADR-2: Mutate `direction` only on cycle, not on activation/clear

**Decision**: First activation reads `this.direction` without changing it; cycle flips and writes it back; clear leaves it untouched.

**Rationale**: Consumers set `direction="desc"` to express "when this chip activates, sort descending first." Mutating it on activation would silently break that contract. Mutating on cycle is the only way the user's intent ("flip") survives the next render. Mutating on clear would erase the consumer's preferred default.

**Rejected alternatives**:

- **Add a separate `defaultDirection` property**: cleaner separation but doubles the public API surface. The proposal explicitly prefers documenting current behavior over expanding the API.
- **Never mutate, store cycled direction in private state**: makes the rendered direction diverge from the property, confusing consumers using devtools.

### ADR-3: Wrapper owns the border, children are border-less

**Decision**: `.chip` owns the outer border + radius + `overflow: hidden`; child buttons have no border except a single `border-left` separator on `.clear`.

**Rationale**: Stitching two bordered buttons into one chip-shape produces double-border seams and pixel rounding artifacts. The wrapper-owns-border pattern is standard for segmented controls and gives clean radii via `overflow: hidden`.

**Rejected alternatives**:

- **CSS `border-collapse`-style hacks with negative margins**: fragile across browsers and zoom levels.
- **Single button with an `::after` pseudo-element for the `×`**: pseudo-elements aren't independently focusable — would require manual `aria-*` plumbing and synthetic clicks, which is exactly what the proposal sets out to remove.

### ADR-4: Add `sort.clear` to i18n; keep defensive fallback

**Decision**: Extend the `Translations` type with `sort.clear`, populate `en` and `es`, but read with `?? 'Clear sort'` in the component.

**Rationale**: Adding to the `typeof en` shape forces `es.ts` to provide it (compile-time guarantee). The runtime fallback protects against downstream consumers who override translations and forget the key — a cheap defense for a low-cost component.

**Rejected alternatives**:

- **Hard-code English in the component**: blocks Spanish UI for v1.
- **Reuse `filter.clear`**: semantically wrong (`Limpiar` means "clear" generically; `Quitar orden` is more precise for "remove sort").

### ADR-5: Confirmed no change to `fv-view._onSortChange`

**Decision**: The proposal flagged consecutive non-null events on the same field as a risk. Confirmed via code reading that the existing handler does a fresh object assignment and re-emits unconditionally — no fix required.

**Rationale**: See `fv-view risk confirmation` section above. Lit reactivity, the `applySort` getter, and storage/URL writes all handle the new direction transparently.

## Files to change

- `src/components/fv-sort-action.ts` — full rewrite of template, styles, handlers; rename `_onClick` to `_onActivateOrCycle` and add `_onClear`.
- `src/i18n/en.ts` — add `sort.clear: 'Clear sort'`.
- `src/i18n/es.ts` — add `sort.clear: 'Quitar orden'`.
- `src/__tests__/components/fv-sort-action.test.ts` — rename handler in existing tests, add 8 new tests per Test strategy.

No changes to: `src/components/fv-view.ts`, `src/types.ts`, `src/utils/sort-filter.ts`, `src/utils/persistence.ts`.

## Risks and assumptions

- **Assumption**: All current consumers rely on the public event contract (`sort-change` with `SortChangeDetail`) and `for=`-based wiring. If anyone subclasses `FvSortAction` and overrides `_onClick`, they break — accepted, this is private API and the rename is intentional.
- **Risk**: Visual regression on consumer themes that target `fv-sort-action button` via `::part()` or shadow-piercing. Mitigated by adding `part="main|clear"` so explicit theming has a stable hook; legacy theming via deep selectors was already non-portable.
- **Risk**: Screen-reader ergonomics — two adjacent buttons in the same chip. Mitigated by `aria-pressed` on main and a distinct `aria-label` on clear; tested manually in tasks phase.
- **Open question (deferred)**: Animation of clear button mount/unmount. Out of scope for this change per proposal.
