# Design: Icon Components + Theme Object

## Technical Approach

Extend `FlexiView.configure()` to accept React/icon components as icon values, and enhance the theme object support. The approach adds a normalization layer in `registry.ts` that handles the three icon types (string, React component, render function) and converts them to renderable HTML.

## Architecture Decisions

### Decision: Icon type normalization

**Choice**: Add `normalizeIcon()` utility in `registry.ts` that handles all three icon types
**Alternatives considered**:
- Handle normalization in each component individually (rejected: duplication)
- Use a separate icon adapter module (rejected: unnecessary indirection)
- Accept only render functions (rejected: breaks backward compatibility)
**Rationale**: Single place for icon handling maintains consistency; backward-compatible with strings; minimal code change

### Decision: React component detection

**Choice**: Use duck typing to detect React components (check for `$$typeof` or `render` property)
**Alternatives considered**:
- Import React in registry.ts (rejected: adds dependency, breaks CDN compatibility)
- Use Symbol-based detection (rejected: React internal, may change)
- Type-based detection via TypeScript only (rejected: runtime still needs handling)
**Rationale**: Works without explicit React dependency; handles common React component patterns; safe fallback to string

### Decision: Theme object to CSS variable conversion

**Choice**: Reuse existing `_buildTokensBlock()` function — it already handles theme object
**Alternatives considered**:
- New dedicated theme serializer (rejected: unnecessary, existing works)
- CSS-in-JS solution (rejected: adds complexity)
- JSON-based theme API (rejected: not CSS-compatible)
**Rationale**: Existing `_buildTokensBlock()` already merges theme object with defaults and produces CSS variables; no new code needed

## Data Flow

```
FlexiView.configure({ icons: { sortAsc: IconArrowUp }, theme: {...} })
         │
         ▼
registry.ts: configure()
         │
         ├─► normalizeIcon(IconArrowUp) ──► HTML string/HTMLElement
         │
         └─► _buildTokensBlock(theme) ──► CSS custom properties
         │
         ▼
adoptedStyleSheet updated + subscribers notified
         │
         ▼
Components re-render with normalized icons
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/types.ts` | Modify | Add `FlexiViewIconValue` type union: `string \| React.ComponentType \| ((props?: any) => HTMLElement)` |
| `src/registry.ts` | Modify | Add `normalizeIcon()` utility; update `getFlexiConfig()` to handle component types |
| `src/components/fv-switcher.ts` | Modify | Use `normalizeIcon()` for view icons |
| `src/components/fv-sort-action.ts` | Modify | Use `normalizeIcon()` for sort icons |
| `src/components/fv-filter-action.ts` | Modify | Use `normalizeIcon()` for filter icon |
| `src/components/fv-export-action.ts` | Modify | Use `normalizeIcon()` for export icon |
| `src/components/fv-header-menu.ts` | Modify | Use `normalizeIcon()` for menu icons |
| `src/__tests__/unit/registry.test.ts` | Modify | Add tests for `normalizeIcon()` with all three types |

## Interfaces / Contracts

```typescript
// New type in types.ts
type FlexiViewIconValue = 
  | string                                           // SVG string (existing)
  | React.ComponentType<any>                         // React component
  | ((props?: Record<string, unknown>) => HTMLElement); // Render function

interface FlexiViewIcons {
  sortAsc?: FlexiViewIconValue;
  sortDesc?: FlexiViewIconValue;
  filter?: FlexiViewIconValue;
  clearFilter?: FlexiViewIconValue;
  close?: FlexiViewIconValue;
  export?: FlexiViewIconValue;
  gridView?: FlexiViewIconValue;
  listView?: FlexiViewIconValue;
  cardsView?: FlexiViewIconValue;
}

// New utility in registry.ts
function normalizeIcon(icon: FlexiViewIconValue | undefined): string {
  if (!icon) return '';
  if (typeof icon === 'string') return icon;
  if (typeof icon === 'function') {
    const el = icon();
    return el.outerHTML;
  }
  // React component detection
  if (icon && typeof icon === 'object' && '$$typeof' in icon) {
    // Use render method or serialize
    return (icon as any).render?.()?.outerHTML ?? '';
  }
  return '';
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `normalizeIcon()` handles string, component, function | Test with mock React component, arrow function, string |
| Unit | Theme object merge behavior | Test partial overrides, multiple calls |
| Integration | Components render custom icons | Render fv-sort-action with component icon |
| E2E | Full configure flow | Load flexi-view, call configure, verify icons render |

## Migration / Rollback

No migration required. Changes are fully additive:
- Existing string icons work unchanged
- Theme object already supported via partial theme override
- Rollback: Remove `FlexiViewIconValue` type, remove `normalizeIcon()` function, components revert to string-only

## Open Questions

- [ ] Should we support Preact or other React-compatible libraries? (Not in scope for v1)
- [ ] How to handle icon sizing when using React components? (Document: pass size prop via component props)
- [ ] CDN behavior with React components? (Document: CDN users should use string icons; React components require bundler)