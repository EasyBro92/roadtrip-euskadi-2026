# Arquitectura

## Árbol del proyecto

```
roadtrip-euskadi-2026/
├── .env.example
├── README.md · ARCHITECTURE.md · DEPLOYMENT.md · SECURITY.md ·
│   LIMITATIONS.md · TESTING.md · DECISIONS.md
├── netlify.toml · vercel.json · Dockerfile · nginx.conf ·
│   docker-compose.yml · .github/workflows/deploy.yml
├── playwright.config.ts · vite.config.ts (incluye config de Vitest)
├── e2e/main-flows.spec.ts
├── server/copilot/            (backend de ejemplo, IA con key solo en servidor)
├── public/icons/, favicon.svg
├── tests/{utils,services,stores}
└── src/
    ├── main.tsx · App.tsx
    ├── app/
    │   ├── router.tsx          (rutas con code-splitting vía React.lazy)
    │   └── layout/AppShell.tsx, BottomNav.tsx
    ├── pages/                  (16 pantallas, una por ruta)
    ├── types/                  (Trip, Stop, Place, Vehicle, Expense, Refuel,
    │                            Photo, Achievement, Favorite, Note,
    │                            ChecklistItem, AppSettings, OfflinePackage,
    │                            CopilotSuggestion, HistorySnapshot...)
    ├── data/                   (itinerario semilla de los 5 días, lugares
    │                            opcionales, logros, checklist — datos puros)
    ├── stores/                 (Zustand: trip, ui, settings, location,
    │                            animación del vehículo)
    ├── services/
    │   ├── storage/            (StorageService sobre localStorage, db.ts
    │   │                        Dexie/IndexedDB, schema.ts validación Zod)
    │   ├── map/                (definición de capas de mapa)
    │   ├── routing/             (RoutingService + 4 providers + fallback
    │   │                        línea recta)
    │   ├── geocoding/          (Nominatim, debounce, caché, throttling)
    │   ├── expenses/, vehicle/, photos/, achievements/, copilot/,
    │   │   export/, sharing/, offline/, location/
    ├── features/                (componentes por dominio: map, itinerary)
    ├── components/               (ToastStack, ModalHost, StatCard — kit compartido)
    ├── hooks/                    (useTripStats, useStopsOfDay)
    └── utils/                    (geo, dates, format, polyline, carIcon,
                                    categoryGradient, download, env, id)
```

## Capas y flujo de datos

```
data/*.ts (constantes)
      │  seed inicial
      ▼
stores/useTripStore  ──persist(localStorage)──▶  StorageService
      │  selectors (hooks/useStopsOfDay, useTripStats)
      ▼
pages/*  ──renderizan──▶  features/*  ──usan──▶  services/*
```

`useTripStore` es la única fuente de verdad del viaje. Las páginas y
features leen vía selectores memoizados (nunca llaman directamente a un
método del store que devuelva un array nuevo cada vez — ver el comentario en
`hooks/useStopsOfDay.ts` sobre por qué eso rompe `useSyncExternalStore`).
Los `services/*` son funciones puras o clases sin JSX, testeables de forma
aislada (ver `tests/services/`).

## Decisiones técnicas y por qué

1. **Zustand + `persist`** en vez de Redux/Context: menos boilerplate para 5
   dominios de estado (trip, ui, settings, location, animación), y el
   middleware `persist` ya resuelve la serialización a localStorage con un
   adaptador propio (`createZustandStorageAdapter`) namespaced.
2. **localStorage para estado, IndexedDB (Dexie) para binarios**: las fotos
   comprimidas y el historial de snapshots viven en IndexedDB porque el
   límite de 250MB del objetivo offline no cabe en los ~5-10MB de
   localStorage. `PhotoService` nunca guarda el `Blob` en el store de
   Zustand, solo metadatos ligeros.
3. **`useStopsOfDay` como hook dedicado, no un método del store**: un
   método de Zustand que hace `.map().filter()` y devuelve un array nuevo en
   cada llamada rompe `useSyncExternalStore` cuando se usa como selector
   reactivo (React ve una "snapshot" distinta en cada comprobación de
   consistencia y entra en bucle de renders — nos pasó de verdad durante el
   desarrollo, ver el commit que introdujo el hook). La solución: suscribirse
   a las piezas de estado realmente estables (`stopIds`, `stopsById`) y
   memoizar la combinación con `useMemo`.
4. **Leaflet + React-Leaflet, no Google Maps** (requisito explícito del
   encargo): sin API key, tiles cacheables por Service Worker.
5. **RoutingService con cadena de providers**: OSRM (demo público, sin
   clave) → Valhalla (demo público) → GraphHopper/OpenRouteService (si hay
   clave) → línea recta marcada `isFallback: true`. Nunca lanza al llamador;
   cachea éxitos, reintenta fallos (ver `tests/services/RoutingService.test.ts`).
6. **CopilotService con motor local por defecto**: reglas explicables
   (`localEngine.ts`, cada sugerencia lleva `reason`), y un motor remoto
   opcional que llama a un backend propio (`server/copilot/`) — la clave de
   IA nunca toca el frontend.
7. **Code splitting por ruta** (`React.lazy` en `app/router.tsx`): cada
   pantalla es su propio chunk, cargado solo al navegar a ella. Reduce el
   bundle inicial de ~2MB a ~350KB para el chunk más pesado (mapa, que
   incluye Leaflet).
8. **Marcador del coche sin emoji**: SVG propio (`utils/carIcon.ts`), un
   contenedor `.car-rotator` que gira vía CSS `transform: rotate()` según el
   bearing calculado entre dos puntos de la geometría real de la ruta
   (`utils/geo.ts` → `bearingDegrees`, `pointAlongPath`).

## Modelo de datos

Ver `src/types/*.ts` para las interfaces completas. Resumen de las
entidades principales: `Trip` (con `TripDay[]`, `Vehicle`, `ReturnTripOption`),
`Stop` (la entidad central: coordenadas, categoría, gastronomía/hotel/
aparcamiento asociados, estado de visita, fotos), `Place` (biblioteca de
opcionales), `Expense`/`Refuel`, `Photo` (metadatos; el blob vive en Dexie),
`AchievementDefinition`/`AchievementState`, `CopilotSuggestion`.

## Extensiones futuras

Ver el roadmap por fases en [DECISIONS.md](DECISIONS.md).
