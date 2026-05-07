# Delta Spec: rename-data-to-registers

## ADDED Requirements

### Requirement: fv-view MUST accept `registers` property

The `<fv-view>` component SHALL accept a `registers` property as the primary data source, replacing the deprecated `data` property.

- Property name: `registers`
- Type: `T[] | string` (array of records or JSON string)
- Default: `[]`

#### Scenario: fv-view renders with registers prop

- GIVEN `<fv-view>` with `registers` attribute containing `[{id: 1, name: "Alice"}]`
- WHEN component renders
- THEN the internal data array SHALL contain one record with `id: 1` and `name: "Alice"`

#### Scenario: fv-view parses JSON string in registers

- GIVEN `<fv-view>` with `registers="[{&quot;id&quot;:2}]"` (JSON string)
- WHEN component renders
- THEN the internal data array SHALL contain parsed record `{id: 2}`

---

### Requirement: fv-view MUST accept view-specific column props

The `<fv-view>` component SHALL accept three distinct column configuration props, one for each view type:

| Property | Type | View Type |
|----------|------|-----------|
| `fieldGrids` | `ColumnConfig<T>[]` | grid |
| `fieldRows` | `ColumnConfig<T>[]` | list |
| `fieldCards` | `ColumnConfig<T>[]` | cards |

#### Scenario: fv-view renders grid with fieldGrids

- GIVEN `<fv-view view="grid">` with `fieldGrids="[{field: &quot;id&quot;, title: &quot;ID&quot;}]"`
- WHEN grid view renders
- THEN `<fv-grid>` SHALL receive column config with field "id"

#### Scenario: fv-view renders list with fieldRows

- GIVEN `<fv-view view="list">` with `fieldRows="[{field: &quot;name&quot;, title: &quot;Name&quot;}]"`
- WHEN list view renders
- THEN `<fv-list>` SHALL receive column config with field "name"

#### Scenario: fv-view renders cards with fieldCards

- GIVEN `<fv-view view="cards">` with `fieldCards="[{field: &quot;email&quot;, title: &quot;Email&quot;}]"`
- WHEN cards view renders
- THEN `<fv-cards>` SHALL receive column config with field "email"

---

### Requirement: Column configs MUST fall back when view-specific prop missing

If a view-specific column prop is not provided, the component SHALL fall back in this order:

1. Use the view-specific prop if provided
2. Fall back to `fieldGrids` if `fieldRows` or `fieldCards` is missing
3. Fall back to empty array `[]` if no fieldXxx prop is available

#### Scenario: fieldRows falls back to fieldGrids

- GIVEN `<fv-view view="list">` with only `fieldGrids="[{field: &quot;id&quot;}]"` provided
- WHEN list view renders
- THEN `<fv-list>` SHALL receive columns from `fieldGrids`

#### Scenario: fieldCards falls back to fieldGrids

- GIVEN `<fv-view view="cards">` with only `fieldGrids="[{field: &quot;id&quot;}]"` provided
- WHEN cards view renders
- THEN `<fv-cards>` SHALL receive columns from `fieldGrids`

#### Scenario: no fieldXxx props renders empty view

- GIVEN `<fv-view view="grid">` with no fieldXxx props
- WHEN grid view renders
- THEN `<fv-grid>` SHALL receive empty column array `[]`

---

## MODIFIED Requirements

### Requirement: DataViewOptions type MUST reflect renamed properties

The `DataViewOptions<T>` interface in `src/types.ts` SHALL use the new property names:

```typescript
export interface DataViewOptions<T = Record<string, unknown>> {
  registers: T[];
  fieldGrids?: ColumnConfig<T>[];
  fieldRows?: ColumnConfig<T>[];
  fieldCards?: ColumnConfig<T>[];
  view?: 'grid' | 'list' | 'cards';
  storageKey?: string;
}
```

(Previously: `data: T[]` and `columns: ColumnConfig<T>[]`)

#### Scenario: DataViewOptions with registers and fieldGrids

- GIVEN `DataViewOptions` with `registers: [{id: 1}]` and `fieldGrids: [{field: 'id'}]`
- WHEN options are applied to fv-view
- THEN view SHALL render with registers data and grid columns

#### Scenario: DataViewOptions with all three fieldXxx

- GIVEN `DataViewOptions` with `registers`, `fieldGrids`, `fieldRows`, `fieldCards` all provided
- WHEN view type changes between grid/list/cards
- THEN appropriate column config SHALL be used for each view

---

## REMOVED Requirements

### Requirement: `data` property MUST NOT be accepted

The `data` property on `<fv-view>` SHALL be removed. Consumers MUST use `registers` instead.

(Reason: Breaking change to improve API semantics)

### Requirement: `columns` property MUST NOT be accepted

The `columns` property on `<fv-view>` SHALL be removed. Consumers MUST use `fieldGrids`, `fieldRows`, or `fieldCards` instead.

(Reason: Breaking change to support view-specific column configurations)

---

## Summary

| Requirement | Type | Status |
|-------------|------|--------|
| registers property | ADDED | New data source prop |
| fieldGrids/fieldRows/fieldCards | ADDED | View-specific column props |
| Column fallback logic | ADDED | fieldRxx → fieldGrids → [] |
| DataViewOptions update | MODIFIED | Type signature change |
| data property | REMOVED | Replaced by registers |
| columns property | REMOVED | Replaced by fieldXxx |