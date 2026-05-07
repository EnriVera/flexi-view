# Delta for types.ts

## ADDED Requirements

### Requirement: ColumnConfig MUST declare exportable as optional boolean

`ColumnConfig<T>` in `src/types.ts` SHALL include `exportable?: boolean` as an explicit optional field. The field MUST NOT remain an implicit convention.

#### Scenario: exportable declared in ColumnConfig

- GIVEN a `ColumnConfig` object with `exportable: false`
- WHEN TypeScript compiles the consuming code
- THEN NO type error SHALL be raised
- AND the type checker SHALL recognize `exportable` as a valid optional boolean field

#### Scenario: ColumnConfig without exportable remains valid

- GIVEN a `ColumnConfig` object with no `exportable` field
- WHEN TypeScript compiles the consuming code
- THEN NO type error SHALL be raised (field is optional)

---

### Requirement: Event detail types MUST be declared for fv-sort-change and fv-filter-change

`src/types.ts` SHALL export:

| Type | Shape |
|------|-------|
| `FvSortChangeDetail` | `{ field: string; direction: 'asc' \| 'desc' \| null }` |
| `FvFilterChangeDetail` | `{ filters: Record<string, unknown> }` |

#### Scenario: FvSortChangeDetail used in event listener

- GIVEN a TypeScript consumer listening for `fv-sort-change`
- WHEN they type the event as `CustomEvent<FvSortChangeDetail>`
- THEN `event.detail.field` and `event.detail.direction` SHALL resolve without type errors

---

## ADDED Requirements (index.d.ts)

### Requirement: JSX types MUST be declared for fv-sort-action, fv-filter-action, fv-export-action

`src/index.d.ts` SHALL declare JSX intrinsic element types for:

| Element | Key attributes |
|---------|---------------|
| `fv-sort-action` | `for?: string`, `field?: string`, `direction?: string`, `active?: boolean` |
| `fv-filter-action` | `for?: string`, `field?: string` |
| `fv-export-action` | `for?: string`, `format?: string`, `filename?: string` |

#### Scenario: JSX consumer uses fv-sort-action with for

- GIVEN a React/Preact/Solid JSX consumer
- WHEN they write `<fv-sort-action for="my-view" field="name" />`
- THEN NO TypeScript JSX type error SHALL be raised
