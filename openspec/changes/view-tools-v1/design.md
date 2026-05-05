# Design: view-tools-v1

## Technical Approach

Greenfield npm library. Lit-based Web Components with Shadow DOM encapsulation. `<data-view>` acts as the stateful controller; sub-views are stateless renderers. All 10 open design questions are resolved below.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|----------|--------|----------|-----------|
| Package structure | Single package (`view-tools`) | Monorepo (`@view-tools/*`) | Monorepo overhead unjustified for v1. ESM named exports give tree-shaking. Migrate to monorepo if sub-package demand emerges. |
| Build tool | Vite library mode | tsup, rolldown | Best WC DX, produces clean ESM + UMD, native TS support, fast HMR in dev. |
| Distribution | ESM + UMD | ESM only | ESM for bundler users; UMD for `<script src>` users (Astro, plain HTML). UMD is one extra Vite output entry. |
| Testing | Vitest (unit) + @web/test-runner (WC) + Playwright (E2E) | Jest, Storybook | Vitest for pure logic; @web/test-runner runs components in a real browser without full E2E overhead; Playwright for integration flows. |
| Dev environment | `dev/index.html` + Vite dev server | Storybook | Storybook adds 500+ deps and config complexity. A simple HTML page with live reload is sufficient for v1 visual development. |
| `visible`/`disable` fn args | `(row: T, index: number, allData: T[])` | `(row)` only | Full context needed for cross-row logic (e.g., disable based on other rows' state). |
| Event shape | `CustomEvent`, `bubbles: true`, `composed: true`, payload in `detail` | plain events | `composed: true` is required to cross Shadow DOM boundaries. `bubbles` lets host apps listen on `<data-view>` instead of the inner sub-view. |
| CSS Custom Properties | `--dv-bg`, `--dv-border`, `--dv-row-hover`, `--dv-header-bg`, `--dv-font-size`, `--dv-radius`, `--dv-primary` | Class-based theming | CSS vars traverse Shadow DOM naturally. 7 vars covers 90% of theming needs without leaking internals. |
| Filter defaults | text → `includes` (case-insensitive), number → exact, date → exact | Range filters for all | Text contains is the universal case. Numeric/date ranges need UI (range picker) — defer to v1.x. |
| Row selection | v1.x | v1 | No spec coverage, no UI spec, requires selection model design. Out of scope per proposal. |

## Data Flow

```
Host App
  │
  ├─ sets: data[], columns[], view, storage-key
  └─ listens: filter-change, sort-change, row-click, ...
        │
   <data-view>  ←── owns: activeView, filters{}, sortConfig{}
        │            reads/writes: localStorage | url | session
        │
        ├─ processes: filter(data) → sort(data) → filteredData[]
        │
        └─ renders active sub-view:
             <data-grid> | <data-list> | <data-cards>
                  │
                  └─ per row: createElement(column.control)
                              .item = row
                              .params = column.params
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Create | `view-tools`, deps: lit. devDeps: vite, typescript, vitest, @web/test-runner, playwright |
| `vite.config.ts` | Create | Library mode, entry: `src/index.ts`, formats: `es`, `umd` |
| `tsconfig.json` | Create | Strict mode, decorators, target ES2020 |
| `src/index.ts` | Create | Re-exports all components, auto-registers built-in controls |
| `src/types.ts` | Create | `ColumnConfig<T>`, `DataViewOptions`, event detail types |
| `src/registry.ts` | Create | `configureGrid()` — lazy control loader using `whenDefined()` |
| `src/components/data-view.ts` | Create | Wrapper: state, persistence, array processing, sub-view delegation |
| `src/components/data-grid.ts` | Create | Table renderer, sort/filter UI, emits events |
| `src/components/data-list.ts` | Create | List renderer, emits row-click |
| `src/components/data-cards.ts` | Create | Cards renderer, emits row-click |
| `src/components/view-switcher.ts` | Create | Optional view toggle element |
| `src/controls/dv-text.ts` | Create | Built-in text cell |
| `src/controls/dv-number.ts` | Create | Built-in number cell |
| `src/controls/dv-date.ts` | Create | Built-in date cell |
| `src/controls/dv-badge.ts` | Create | Built-in badge cell |
| `dev/index.html` | Create | Dev sandbox with Vite dev server |
| `dev/demo.ts` | Create | Sample data + column configs for manual testing |

## Interfaces / Contracts

```ts
interface ColumnConfig<T = Record<string, unknown>> {
  control: string;                                          // tag name
  params?: Record<string, unknown>;
  title: string;
  field?: keyof T;
  sortable?: boolean;
  filterable?: boolean;
  visible?: boolean | ((row: T, index: number, allData: T[]) => boolean);
  disable?: boolean | ((row: T, index: number, allData: T[]) => boolean);
}

// Event details
type SortChangeDetail  = { field: string; direction: 'asc' | 'desc' };
type FilterChangeDetail = { field: string; value: unknown };
type RowClickDetail<T> = { item: T; index: number };
```

## Testing Strategy

| Layer | What to Test | Tool |
|-------|-------------|------|
| Unit | Sort/filter logic, persistence read/write, configureGrid registry | Vitest |
| Component | WC rendering, event emission, Shadow DOM, control instantiation | @web/test-runner |
| E2E | Full view-switch flow, persistence across reload, cross-framework usage | Playwright |

## Migration / Rollout

No migration required. New package published to npm as `view-tools@1.0.0-alpha.1` during development.

## Open Questions

None — all 10 open questions resolved above.
