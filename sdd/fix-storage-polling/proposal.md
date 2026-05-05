# Proposal: fix-storage-polling

## Intent

El evento `storage` del API de localStorage SOLO se dispara cuando el cambio ocurre desde OTRA pestaña/ventana. Cuando el usuario elimina datos desde DevTools (misma pestaña), el evento NO se dispara.

## Scope

### In Scope
- Usar polling (setInterval) para detectar cambios en localStorage desde la misma página

### Out of Scope
- Ninguno

## Approach

Cambiar de event listener a polling con setInterval para detectar cambios en localStorage.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/data-view.ts` | Modified | Cambiar storage listener por polling |

## Success Criteria

- [ ] Al borrar localStorage desde DevTools, la vista se actualiza