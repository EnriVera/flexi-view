# Design: rename-data-to-registers

## Technical Approach

Rename all public API properties from `data` to `registers` and replace `columns` with three view-specific props (`fieldGrids`, `fieldRows`, `fieldCards`). The change is a breaking change—no backward compatibility aliases.

## Architecture Decisions

### Decision: Three separate props for columns

**Choice**: Replace single `columns` prop with `fieldGrids`, `fieldRows`, `fieldCards`

**Alternatives considered**: Single prop with type discrimination, view-type-specific sub-objects

**Rationale**: Each view type (grid/list/cards) has distinct field requirements; explicit props align with existing `<fv-grid>`, `<fv-list>`, `<fv-cards>` component names. Simplifies type checking and documentation.

### Decision: Pure rename (no aliases)

**Choice**: Direct property rename with no backward-compatible aliases

**Rationale**: Cleaner public API, no alias technical debt. Library consumers expected to migrate.

## Data Flow

```
<fv-view>
  ├── .registers (was .data)
  ├── .fieldGrids (was .columns for grid)
  ├── .fieldRows (was .columns for list)
  └── .fieldCards (was .columns for cards)
       │
       ▼
   <fv-grid|fv-list|fv-cards>
       │
       ▼
   .registers (was .data)
   .fieldGrids|fieldRows|fieldCards (was .columns)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/fv-view.ts` | Modify | Rename `data`→`registers`, add `fieldGrids/fieldRows/fieldCards` setters |
| `src/components/fv-grid.ts` | Modify | Rename `@property data`→`registers`, `@property columns`→`fieldGrids` |
| `src/components/fv-list.ts` | Modify | Rename `@property data`→`registers`, `@property columns`→`fieldRows` |
| `src/components/fv-cards.ts` | Modify | Rename `@property data`→`registers`, `@property columns`→`fieldCards` |
| `src/components/fv-header-menu.ts` | Modify | Rename `data`→`registers`, `columns`→`fieldGrids` (since only used in grid context) |
| `src/components/fv-export-action.ts` | Modify | Rename `.data`→`.registers`, `.columns`→`.fieldGrids` |
| `src/types.ts` | Modify | Update `DataViewOptions` interface: `data`→`registers`, add `fieldGrids/fieldRows/fieldCards` |
| `src/types.ts` | Modify | Update `HeaderMenuElement`: `data`→`registers` |
| `src/index.d.ts` | Modify | Update JSX types for all components |
| `src/__tests__/components/fv-view.test.ts` | Modify | Update property references in tests |
| `src/__tests__/components/fv-export-action.test.ts` | Modify | Update `.data`→`.registers`, `.columns`→`.fieldGrids` |
| `src/__tests__/components/fv-grid.test.ts` | Modify | Update property references |
| `src/__tests__/components/fv-list.test.ts` | Modify | Update property references |
| `src/__tests__/components/fv-cards.test.ts` | Modify | Update property references |
| `src/__tests__/components/fv-header-menu.test.ts` | Modify | Update property references |

## Property Changes per File

### fv-view.ts

- `set data(val)` → `set registers(val)` (lines 52-63)
- `get data()` → `get registers()` (line 64)
- `set columns(val)` → `set fieldGrids/fieldRows/fieldCards(val)` (lines 66-78)
- Add new setters/getters for `fieldGrids`, `fieldRows`, `fieldCards`
- Update internal `_data` to `_registers`, `_columns` to `_fieldGrids/Rows/Cards`
- Update `_renderView()` to pass correct prop to child components

### fv-grid.ts

- Line 65: `@property({ attribute: false }) data:` → `@property({ attribute: false }) registers:`
- Line 66: `@property({ attribute: false }) columns:` → `@property({ attribute: false }) fieldGrids:`

### fv-list.ts

- Line 31: `@property({ attribute: false }) data:` → `@property({ attribute: false }) registers:`
- Line 32: `@property({ attribute: false }) columns:` → `@property({ attribute: false }) fieldRows:`

### fv-cards.ts

- Line 51: `@property({ attribute: false }) data:` → `@property({ attribute: false }) registers:`
- Line 52: `@property({ attribute: false }) columns:` → `@property({ attribute: false }) fieldCards:`

### fv-header-menu.ts

- Line 66: `@property({ attribute: false }) data:` → `@property({ attribute: false }) registers:`
- Line 65: `@property({ attribute: false }) columns:` → `@property({ attribute: false }) fieldGrids:` (grid context)

### types.ts

- `DataViewOptions.data` → `DataViewOptions.registers`
- Add `DataViewOptions.fieldGrids`, `DataViewOptions.fieldRows`, `DataViewOptions.fieldCards`
- `HeaderMenuElement.data` → `HeaderMenuElement.registers`

### index.d.ts (JSX types)

- Update all component JSX types: `data`→`registers`, `columns`→`fieldGrids/fieldRows/fieldCards`

## Interfaces / Contracts

```typescript
// types.ts - Updated DataViewOptions
export interface DataViewOptions<T = Record<string, unknown>> {
  registers: T[];
  fieldGrids?: ColumnConfig<T>[];
  fieldRows?: ColumnConfig<T>[];
  fieldCards?: ColumnConfig<T>[];
  view?: 'grid' | 'list' | 'cards';
  storageKey?: string;
}

// types.ts - Updated HeaderMenuElement
export interface HeaderMenuElement<T = Record<string, unknown>> {
  column: ColumnConfig<T>;
  fieldGrids: ColumnConfig<T>[];
  registers: T[];
  filteredData: T[];
  currentSort: SortChangeDetail | null;
  currentFilters: Record<string, unknown>;
  anchor: HTMLElement | null;
  open(): void;
  close(): void;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Property rename in each component | Verify new properties work identically to old |
| Integration | fv-view passes correct props to children | Verify data flows through renamed props |
| Integration | JSX types work in React consumers | Verify TypeScript compiles |

## Migration / Rollout

No migration required—breaking change with direct rename. Document in CHANGELOG and bump major version.

## Open Questions

- [ ] None—all properties clearly identified across files