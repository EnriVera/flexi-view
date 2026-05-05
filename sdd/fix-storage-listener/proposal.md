# Proposal: fix-storage-listener

## Intent

Cuando el usuario elimina los datos de localStorage manualmente (desde DevTools), la vista del data-view no se actualiza automáticamente. Necesita hacer F5 para ver los cambios.

**Causa raíz**: El data-view lee el estado solo en `connectedCallback`, no detecta cambios en localStorage durante su ciclo de vida.

## Scope

### In Scope
- Agregar listener para evento `storage` de window
- Actualizar la vista automáticamente cuando cambie el storageKey

### Out of Scope
- Otros componentes que dependan de localStorage

## Approach

Escuchar el evento `window.addEventListener('storage', ...)` y actualizar el estado interno cuando cambie el registro asociado al storageKey.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/data-view.ts` | Modified | Agregar storage listener en connectedCallback |

## Risks

- None

## Success Criteria

- [ ] Al borrar localStorage, la vista se actualiza automáticamente