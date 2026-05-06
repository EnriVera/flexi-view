# filter-modal Design

## Overview

Create a modal-based filter interface that displays ALL unique column values with multi-select checkboxes, replacing the current inline filter dropdown in `fv-header-menu`.

## Current State

- `fv-filter-action`: Inline dropdown showing unique values in header menu popover
- `fv-header-menu`: Renders `fv-filter-action` inline when `column.filterable === true`
- Current implementation limits visibility to popover area (~160px wide)

## Target State

- `fv-filter-modal`: Standalone modal component with full-screen overlay
- `fv-header-menu`: Shows "Ver todos" button that opens the modal
- Modal displays scrollable list of all unique values

---

## Architecture

### Components

| Component | Responsibility |
|-----------|----------------|
| `fv-filter-modal` | Modal overlay with checkbox list |
| `fv-header-menu` | Adds "Ver todos" button, opens modal on click |

### Component: fv-filter-modal

**Public API:**

```typescript
// Properties
@property() field: string = '';
@property({ attribute: false }) options: string[] = [];
@property({ attribute: false }) selected: string[] = [];

// Events
@dispatch('filter-change') // detail: { field, value: string[] | null }
@dispatch('modal-close')
```

**Internal State:**
- `_open`: boolean — modal visibility
- `_selected`: string[] — currently checked values (local state for optimistic UI)

**Behavior:**
1. On open: initialize `_selected` from `selected` prop
2. On checkbox change: update local `_selected`, dispatch `filter-change` immediately
3. On close: dispatch `close` event (parent handles state sync)

### Component: fv-header-menu (update)

**Changes:**

1. Remove inline `fv-filter-action` from popover (lines 102-111)
2. Add "Ver todos" button in sort section (or separate section)
3. Open `fv-filter-modal` via `id` reference or create on demand

```typescript
// New property
@property({ attribute: false }) showFilterModal = false;

// Render change
${this.column.filterable ? html`
  <button class="filter-btn" @click=${this._openFilterModal}>
    Ver todos
  </button>
  <fv-filter-modal
    ...props
    ?open=${this._isFilterModalOpen}
    @filter-change=${this._onFilterChange}
    @modal-close=${this._closeFilterModal}
  ></fv-filter-modal>
` : ''}
```

---

## UI/UX Specification

### Modal Layout

```
┌─────────────────────────────────────┐
│  ▼ FILTRO: {column.title}    [X]    │  ← header with title + close
├─────────────────────────────────────┤
│  ☐ Active                           │
│  ☐ Pending                          │  ← checkboxes (scrollable)
│  ☐ Archived                        │
│  ...                               │
│  ☐ (50 more values...)             │
├─────────────────────────────────────┤
│  [ LIMPIAR ]        [ APLICAR ]     │  ← action buttons (optional)
└─────────────────────────────────────┘
```

**Dimensions:**
- Width: `min(320px, 90vw)`
- Max height: `min(400px, 80vh)`
- Border radius: `8px`
- Backdrop: `rgba(0, 0, 0, 0.4)`

### Styling (CSS)

```css
.fv-filter-modal {
  --modal-bg: var(--fv-bg, #fff);
  --modal-border: var(--fv-border, #e0e0e0);
  
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  z-index: 10000;
}

.modal {
  background: var(--modal-bg);
  border: 1px solid var(--modal-border);
  border-radius: 8px;
  width: min(320px, 90vw);
  max-height: min(400px, 80vh);
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--modal-border);
  font-weight: 600;
}

.options {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  cursor: pointer;
}

.option:hover {
  background: var(--fv-row-hover, #f5f5f5);
}

.footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--modal-border);
  justify-content: flex-end;
}
```

### Close Behavior

- **Escape key**: Listen on document, dispatch close
- **Outside click**: Detect via backdrop click, dispatch close
- **Close button**: Click on [X], dispatch close

---

## Data Flow

### Parent → Modal

```
fv-view (data, columns)
    ↓
fv-grid → fv-header-menu → fv-filter-modal
    ↓ (prop drilled)
field: string
options: string[]  // unique values from data
selected: string[]  // from _filters[field]
```

### Modal → Parent

```
fv-filter-modal dispatches 'filter-change'
    ↓
fv-header-menu re-dispatches (bubbles: true)
    ↓
fv-grid catches 'filter-change' → updates _filters → re-renders
```

---

## Implementation Checklist

- [ ] Create `src/components/fv-filter-modal.ts`
  - [ ] Modal markup with backdrop and content
  - [ ] Checkbox list rendering
  - [ ] Close handling (Escape, backdrop, button)
  - [ ] `filter-change` event dispatch
- [ ] Update `src/components/fv-header-menu.ts`
  - [ ] Add "Ver todos" button
  - [ ] Integrate `fv-filter-modal`
  - [ ] Wire up open/close state
- [ ] Update `src/index.ts` exports
- [ ] Add tests for `fv-filter-modal`

---

## Edge Cases

| Scenario | Handling |
|-----------|----------|
| Empty options | Show "No hay valores disponibles" message |
| 100+ options | Scroll container, no virtualization |
| All deselected | Dispatch `filter-change` with `value: null` |
| Modal closed without changes | Local state discarded, parent unchanged |
| Data changes while open | Parent re-renders, modal receives new options |

---

## Dependencies

- **Lit**: Used by existing components (`@customElement`, `html`, `css`)
- **No new deps**: Reuses existing patterns from `fv-filter-action`

---

## File Changes

| File | Change |
|------|--------|
| `src/components/fv-filter-modal.ts` | New file |
| `src/components/fv-header-menu.ts` | Modify (add button, modal) |
| `src/index.ts` | Add export |
| `src/__tests__/components/fv-filter-modal.test.ts` | New test file |

---

## Out of Scope

- Filter persistence (already handled by `fv-view`)
- Server-side filtering (data assumed pre-loaded)
- Filter operators (always OR for multi-select)
- Remember scroll position (re-render on data change)