# Pruebas

## Unitarias / integración (Vitest)

```bash
npm run test        # una pasada, para CI
npm run test:watch  # modo watch, para desarrollo
```

40 tests reales cubriendo lógica crítica que sí puede romperse en silencio:

- `tests/utils/geo.test.ts` — haversine, bearing, interpolación de posición
  a lo largo de una ruta (la base matemática de la animación del coche).
- `tests/services/ExpenseService.test.ts` — totales, reparto entre
  viajeros, balance, coste por km, CSV.
- `tests/services/VehicleService.test.ts` — consumo real solo se calcula
  con al menos dos repostajes de depósito lleno; nunca se inventa un
  consumo (ver LIMITATIONS.md).
- `tests/services/AchievementService.test.ts` — un logro desbloqueado no
  pierde su fecha de desbloqueo al reevaluar; detección de "recién
  desbloqueados".
- `tests/services/RoutingService.test.ts` — cuando todos los proveedores de
  rutas fallan, cae a línea recta marcada `isFallback: true`; los éxitos se
  cachean, los fallos se reintentan (no se cachea un fallo transitorio).
- `tests/services/schema.test.ts` — un JSON importado que no cumple el
  esquema se rechaza; un intento de contaminar `__proto__` queda inerte
  (nunca se ejecuta como código).
- `tests/stores/useTripStore.test.ts` — favoritos, alta de gastos, marcar
  visitada, reordenar paradas, eliminar parada, deshacer.

## Componentes (React Testing Library)

Configurado (`@testing-library/react` + `@testing-library/jest-dom` +
`jsdom` en `vite.config.ts` → `test.environment`). Añadir specs de
componentes en `tests/components/` según se vayan estabilizando las props
públicas de cada uno.

## End-to-end (Playwright)

```bash
npx playwright install   # una sola vez, descarga los navegadores
npm run test:e2e
```

`e2e/main-flows.spec.ts` cubre los 15 flujos de la sección 51 del encargo:
abrir la app, comenzar el viaje, cambiar de día, seleccionar parada, animar
el coche, añadir favorito, añadir nota, registrar gasto, añadir lugar,
reordenar, deshacer, exportar, importar, activar offline y completar una
visita. Corre contra `npm run dev` (Playwright levanta el servidor solo,
ver `playwright.config.ts`).

## Qué falta por cubrir

- Suite de componentes propiamente dicha (por ahora solo hay el
  scaffolding de RTL, sin specs de componentes individuales).
- Ejecución real de la suite Playwright en este entorno (los navegadores no
  están instalados aquí; el spec es real y ejecutable en cualquier máquina
  con `npx playwright install`).
