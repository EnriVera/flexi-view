# Design: fix-localstorage-persistence

## Technical Approach

Cambiar de un enfoque basado en eventos a un enfoque basado en propiedades reactivas. En lugar de depender de que el evento `view-change` llegue correctamente a través del Shadow DOM, el `data-view` observará cambios en su propiedad `view` y guardará automáticamente.

## Architecture Decisions

### Decision: Persistencia basada en property observer

**Choice**: Usar `willUpdate` o `updated` lifecycle hook para detectar cambios en `view` y guardar automáticamente
**Alternatives considered**: 
- Continuar con event listeners (actual approach)
- Usar `@property({ attribute: false })` con getter/setter
**Rationale**: 
- Lit tiene un sistema reactivo robusto que ya detecta cambios de propiedades
- Elimina la dependencia de que el evento atraviese correctamente el Shadow DOM
- Menos código y más mantenible

### Decision: Property vs State para vista

**Choice**: La property `view` debe ser la fuente de verdad, no un estado interno `_activeView`
**Alternatives considered**: Mantener `_activeView` separado
**Rationale**:
- La property `view` ya tiene `reflect: true` (se sincroniza con attribute)
- Simplifica el flujo: cambio en property → guardar → done
- Menos lugares donde puede fallar

## Data Flow

```
data-switch click
    ↓
_update activeView
    ↓
_dispathEvent('view-change', { view })
    ↓
[Shadow DOM boundary - composed: true]
    ↓
data-view.view = newView (setter)
    ↓
willUpdate detecta cambio de 'view'
    ↓
writeState(storageKey, payload)
    ↓
localStorage.setItem()
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/data-view.ts` | Modify | Reemplazar event handler con property observer en willUpdate |

## Interfaces / Contracts

```typescript
// Nuevo flujo de guardado en data-view.ts:

willUpdate(changedProperties: Map<string, unknown>) {
  // Guardar cuando la property 'view' cambia Y hay storageKey
  if (changedProperties.has('view') && this.storageKey) {
    writeState(this.storageKey, this._persistPayload);
  }
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | willUpdate guarda correctamente | Verificar que writeState se llama |
| Integration | Cambio de vista persiste | E2E test con localStorage |
| E2E | F5 restaura correctamente | Playwright test |

## Migration / Rollback

No migration required. El cambio es backwards compatible - el output de localStorage sigue siendo el mismo formato.

## Open Questions

- [ ] None - el enfoque es straightforward