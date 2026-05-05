# Proposal: fix-switch-without-sync-url

## Intent

El usuario reporta que cuando se REMUEVE el atributo `sync-url` y hay datos guardados en localStorage, el switch deja de funcionar. El data-switch externo no cambia la vista.

**Causa raíz**: El flujo de sincronización entre data-switch externo y data-view depende de que el evento `view-change` llegue correctamente. Cuando syncUrl está deshabilitado, el flujo se rompe.

## Scope

### In Scope
- Hacer que el switch funcione correctamente sin sync-url
- Mantener compatibilidad hacia atrás con syncUrl habilitado

### Out of Scope
- Cambios en la estructura de localStorage

## Approach

Simplificar el flujo: el data-switch siempre debe actualizar el estado del data-view, independientemente de syncUrl. La sincronización debe funcionar en ambos modos.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/view-switcher.ts` | Modified | El `_cycle` debe actualizar directamente el target |
| `src/components/data-view.ts` | Modified | Remover dependencia de syncUrl para el flujo básico |

## Risks

- Romper el caso con syncUrl habilitado

## Success Criteria

- [ ] Sin sync-url: click en switch cambia la vista correctamente
- [ ] Con sync-url: click en switch cambia la vista correctamente