# Proposal: fix-localstorage-persistence

## Intent

El usuario define `storage-key="my-data"` en `<data-view>`, pero cuando cambia de vista (grid→list→cards), el valor no se persiste en localStorage. Al hacer F5, la vista no se restaura.

**Causa raíz identificada**: El flujo de persistencia tiene dos problemas:
1. El handler `_onViewChange` tiene lógica de filtrado demasiado compleja que puede bloquear el guardado
2. No hay verificación de que `writeState` realmente se ejecute correctamente

## Scope

### In Scope
- Corregir el flujo de guardado cuando cambia la vista
- Verificar que se inicialice el registro en localStorage si no existe
- Restaurar correctamente la vista desde localStorage al hacer F5

### Out of Scope
- Cambiar la estructura de datos del localStorage (ya definida)
- Agregar más features de persistencia (solo corregir el bug actual)

## Capabilities

### New Capabilities
None (es un bugfix)

### Modified Capabilities
- `view-tools/persistence`: El flujo de guardado no funciona correctamente

## Approach

**Flujo correcto**:
1. Usuario hace click en `data-switch` → `_cycle()` actualiza `activeView` y llama `_notifyChange()`
2. `_notifyChange()` dispara evento `view-change` con `bubbles: true, composed: true`
3. `data-view` tiene listener para `view-change` → `_onViewChange()` actualiza `_activeView` y llama `writeState()`
4. `writeState()` guarda en localStorage

**Corrección**: Simplificar `_onViewChange` para que siempre procese el evento y guarde, sin filtros innecesarios que bloquean el flujo.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/data-view.ts` | Modified | `_onViewChange` debe guardar siempre |
| `src/components/view-switcher.ts` | Modified | Remover actualización directa de property |
| `src/utils/persistence.ts` | OK | Ya funciona correctamente |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| El fix no funciona | Low | Agregar logs de debug para verificar flujo |
| Romper syncUrl | Low | Testear ambos features juntos |

## Rollback Plan

El código anterior está en git. Si el fix no funciona, revertimos con:
```bash
git checkout HEAD~1 -- src/components/data-view.ts src/components/view-switcher.ts
```

## Dependencies

- Ninguna dependencia externa

## Success Criteria

- [ ] Al cambiar de vista, se guarda en localStorage
- [ ] Al hacer F5 con localStorage presente, se restaura la vista
- [ ] Al primer load con `storage-key`, se inicializa el registro con nulls