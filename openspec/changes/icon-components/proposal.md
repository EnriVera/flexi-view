# Proposal: Icon Components + Theme Object

## Intent

Currently `FlexiView.configure()` only accepts SVG strings for icons (`icons.sortAsc = '<svg>...</svg>'`). Developers using modern icon libraries like `@tabler/icons-react` or `lucide-react` must manually render those components and pass the SVG string output — there's no direct way to pass the React component or VNode. Theme customization currently relies on CSS custom properties being manually applied; there's no programmatic theme object that generates the CSS.

## Scope

### In Scope
- Accept icon values as: SVG string (current), React component, or render function
- Accept theme as: CSS custom properties (current) OR theme object that generates CSS variables
- Maintain backward compatibility with existing string-based icons API
- Theme object support with TypeScript types for all 12 tokens
- CDN-compatible fallback when components cannot be rendered

### Out of Scope
- Runtime theme switching animations
- Per-instance component-level theming
- Icon sprite optimization

## Capabilities

### New Capabilities
- `icon-components`: Pass React/icon components directly to `FlexiView.configure({ icons: { sortAsc: IconArrowUp } })`
- `theme-object`: Pass `theme: { primary: '#f00', radius: '8px' }` object instead of relying solely on CSS custom properties

### Modified Capabilities
- `global-config` (existing): Extend icon type union to include component/render function variants

## Approach

1. **Extend Icon Type Union**: Define `FlexiViewIconValue = string | React.ComponentType | ((...args) => HTMLElement)` and update `FlexiViewIcons` interface
2. **Add Icon Renderer Adapter**: In `registry.ts`, add a utility that normalizes any icon type to a renderable HTML string or web component
3. **Theme Object Type**: Extend `FlexiViewTheme` with optional TypeScript hints for supported keys; `_buildTokensBlock()` already handles object → CSS variable conversion
4. **Backward Compatibility**: Default to string behavior; component types handled in component-level render logic

**Example — Tabler Icons with React component:**
```js
import { IconArrowUp, IconArrowDown, IconFilter } from '@tabler/icons-react';

FlexiView.configure({
  icons: {
    sortAsc: IconArrowUp,
    sortDesc: IconArrowDown,
    filter: IconFilter,
  }
});
```

**Example — Theme Object:**
```js
FlexiView.configure({
  theme: {
    primary: '#6366f1',
    radius: '8px',
    fontSize: '14px',
  }
});
```

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/types.ts` | Modified | Add `FlexiViewIconValue` type, update `FlexiViewIcons` union |
| `src/registry.ts` | Modified | Add icon normalization utility, update `getFlexiConfig()` to handle component types |
| `src/components/fv-*.ts` | Modified | Update icon rendering to use normalization helper |
| `src/__tests__/unit/registry.test.ts` | Modified | Add tests for component icon rendering |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| React components don't render in Web Components | High | Provide render function that returns HTMLElement; fallback to string serialization |
| Circular import if icon lib depends on flexi-view | Low | Keep icon adapter in registry.ts, no circular deps |
| CDN builds can't serialize React components | Med | Document CDN limitation; recommend string icons for CDN |

## Rollback Plan

All changes are additive. Remove new type definitions and revert icon normalization helper. Existing string-based icons work unchanged.

## Dependencies

- None — no new npm dependencies required

## Success Criteria

- [ ] `FlexiView.configure({ icons: { sortAsc: IconComponent } })` works with React component passed directly
- [ ] Theme object (`theme: { primary: '#f00' }`) generates `--fv-primary: #f00` CSS variable
- [ ] Backward compatibility: existing string-based icons work unchanged
- [ ] TypeScript types correctly infer `string | React.ComponentType | Function`
- [ ] Unit tests verify icon normalization handles all three types