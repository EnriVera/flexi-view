# Design: fix-switch-without-sync-url

## Technical Approach

El problema es que el view-switcher actual solo actualiza el target vía evento. Pero cuando syncUrl=no hay, el flujo no funciona correctamente. La solución es hacer que el switcher también actualice directamente el target (como hacia antes), mientras mantiene la funcionalidad de eventos para sincronización.

## Architecture Decisions

### Decision: Actualización dual en switcher

**Choice**: El switcher hace DOS cosas: (1) dispara evento, (2) actualiza directamente el target
**Alternatives considered**: Solo usar eventos
**Rationale**: El evento puede no llegar correctamente en algunos casos, la actualización directa es más robusta

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/view-switcher.ts` | Modify | Restaurar actualización directa del target en `_cycle` |

## Implementation

```typescript
// En view-switcher.ts - método _cycle
private _cycle() {
  const currentIndex = VIEWS.indexOf(this.activeView);
  const nextIndex = (currentIndex + 1) % VIEWS.length;
  const nextView = VIEWS[nextIndex];
  
  this.activeView = nextView;
  
  // 1. Dispara evento (para sincronización general)
  this._notifyChange(nextView);
  
  // 2. Actualiza directamente el target (fallback seguro)
  if (this.targetFor) {
    const target = document.getElementById(this.targetFor) as HTMLElement | null;
    if (target) {
      (target as any).view = nextView;
    }
  }
}
```