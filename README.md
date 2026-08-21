# Roadtrip Euskadi 2026

Planificador de roadtrip, diario de viaje, copiloto y gestor de gastos para
el viaje **Roadtrip Euskadi 2026** (Girona → Aragón → Navarra → País Vasco →
Cantabria) en un Volkswagen Golf 1.9 TDI negro.

React 19 + TypeScript + Vite + Leaflet/OpenStreetMap. PWA instalable,
funciona sin conexión para todo lo que no sea el mapa en zonas nuevas.

## Instalación y desarrollo

Requisitos: Node.js 20+ y npm.

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. No hace falta ninguna variable de entorno para
que la app funcione al completo en modo local — ver [.env.example](.env.example)
para las integraciones opcionales.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Type-check (`tsc -b`) + build de producción a `dist/` |
| `npm run preview` | Sirve el build de producción localmente |
| `npm run lint` | Lint con oxlint |
| `npm run test` | Tests unitarios/integración con Vitest |
| `npm run test:e2e` | Tests E2E con Playwright (ver [TESTING.md](TESTING.md)) |

## Documentación

- [ARCHITECTURE.md](ARCHITECTURE.md) — arquitectura completa, árbol del proyecto, modelo de datos, decisiones técnicas
- [DECISIONS.md](DECISIONS.md) — registro de decisiones y roadmap por fases (fuente de verdad del proyecto)
- [DEPLOYMENT.md](DEPLOYMENT.md) — despliegue en Netlify, Vercel, GitHub Pages, Docker
- [SECURITY.md](SECURITY.md) — modelo de seguridad y privacidad
- [LIMITATIONS.md](LIMITATIONS.md) — qué es real, qué es demo, y qué requiere configuración externa
- [TESTING.md](TESTING.md) — estrategia de pruebas
- [.env.example](.env.example) — todas las integraciones opcionales y cómo activarlas
- [server/copilot/README.md](server/copilot/README.md) — backend opcional del copiloto IA

## Estado del proyecto

Fases 0-5 del encargo implementadas y funcionales (mapa con rutas reales por
carretera, itinerario editable con drag&drop, animación del vehículo, panel
inferior de 3 estados, gastos con gráficos, vehículo/repostajes, fotos con
IndexedDB, diario, logros, checklist, favoritos, lugares opcionales,
copiloto de reglas, PWA instalable, exportación JSON/CSV/GPX/GeoJSON, QR).
Ver el detalle exacto de qué está completo y qué queda como trabajo futuro
en [DECISIONS.md](DECISIONS.md).

## Stack

React 19 · TypeScript · Vite 8 · Tailwind CSS v4 · Leaflet + React-Leaflet ·
Zustand · Dexie (IndexedDB) · React Router · Zod · date-fns · Recharts ·
lucide-react · dnd-kit · qrcode · vite-plugin-pwa · Vitest · Playwright.
