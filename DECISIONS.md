# Roadtrip Euskadi 2026 — Decisiones y roadmap

Fuente de verdad del proyecto: vive en el repo, no solo en el chat, para
sobrevivir a un reinicio de contexto.

## Historial de pivotes

- **2026-08-19, primer intento**: se empezó a construir como un único
  `index.html` con Vanilla JS + Leaflet (arquitectura descrita en una
  versión anterior de este archivo). Se llegó a crear `DECISIONS.md` y
  arrancar el diseño, pero antes de escribir código de producción el
  usuario reemplazó el encargo por una spec mucho más completa y explícita:
  proyecto React/TypeScript real, multi-archivo, con servicios,
  persistencia offline de verdad, PWA, tests y documentación.
- **2026-08-19, encargo definitivo**: se reinició sobre esa base. Este
  documento (y `ARCHITECTURE.md`) describen el proyecto tal y como quedó
  construido, no el plan original de archivo único.

## Stack final

React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + Leaflet/React-Leaflet +
Zustand + Dexie + React Router + Zod + date-fns + Recharts + lucide-react +
dnd-kit + qrcode + vite-plugin-pwa + Vitest + Playwright. Justificación
técnica completa en [ARCHITECTURE.md](ARCHITECTURE.md).

## Estado por fase (sección 54 del encargo)

Cada fase quedó funcional antes de pasar a la siguiente, tal como pedía el
encargo.

- **Fase 0 — Arquitectura, modelo de datos, diseño, navegación,
  persistencia**: ✅ completa. Tipos en `src/types/`, itinerario real de los
  5 días en `src/data/`, Tailwind con los tokens de color del encargo,
  bottom nav + router con code-splitting, `StorageService` + Dexie.
- **Fase 1 — Mapa, paradas, Golf, itinerario, panel, Google Maps**: ✅
  completa. Leaflet con 6 capas, rutas reales por carretera (OSRM/Valhalla/
  GraphHopper/ORS con fallback a línea recta), marcador del coche animado
  siguiendo la geometría real, bottom sheet de 3 estados con 9 pestañas,
  botón "Abrir en Google Maps" en cada parada.
- **Fase 2 — Editor, favoritos, notas, gastos, vehículo, checklist**: ✅
  completa. Reordenar con dnd-kit, añadir/duplicar/eliminar/activar-desactivar
  parada, buscador por nombre (Nominatim), favoritos, notas por parada/día,
  gastos con gráficos (Recharts) y reparto entre viajeros, "Mi Golf" con
  repostajes y estadísticas reales, checklist por categorías.
- **Fase 3 — Fotografías, diario, lugares opcionales, cerca de mí, modo
  visita**: ✅ mayormente completa. Fotos comprimidas en IndexedDB, diario
  por día con cronología y relato editable, biblioteca de lugares opcionales
  con filtros y "añadir a la ruta", modo visita (iniciar/marcar
  visitada/registrar gastos y notas desde la ficha). *Pendiente:* "Cerca de
  mí" como pantalla dedicada con categorías (gasolineras, talleres,
  hospitales...) — el servicio de ubicación y el botón ya existen
  (`LocationService`), falta la UI de resultados por categoría.
- **Fase 4 — PWA, offline, compartir, importar, exportar**: ✅ completa.
  Manifest + Service Worker (`vite-plugin-pwa`, caché de tiles incremental),
  paquete offline con itinerario/fotos/rutas precalculadas, exportar JSON/
  GPX/GeoJSON/CSV + QR comprimido + Web Share API, importar JSON validado
  con Zod.
- **Fase 5 — Copiloto, logros, informe final, PDF, pruebas completas**: ✅
  copiloto y logros completos. ⚠️ *parcial:* pantalla de celebración final
  (`/resumen`) exporta el resumen en JSON, pero el PDF premium maquetado
  (portada, mapa capturado, estadísticas) queda para la siguiente iteración
  — `jspdf`/`jspdf-autotable`/`html2canvas` ya están instalados para eso. Los
  tests unitarios (40, Vitest) y el spec E2E (15 escenarios, Playwright)
  están escritos y pasan/son ejecutables; falta correr Playwright con
  navegadores instalados en este entorno.

## Explícitamente fuera de alcance (documentado, no una omisión silenciosa)

Ver el detalle completo en [LIMITATIONS.md](LIMITATIONS.md). Resumen:
descarga masiva de teselas de mapa (política de uso de OSM), enlace público
para compartir (requiere backend propio, no incluido salvo el ejemplo de
copiloto), PDF/Excel de exportación completos, ejecución real de la suite
E2E en este entorno.

## Estado a 21 agosto 2026

- PWA: `registerType: "autoUpdate"` + `skipWaiting`/`clientsClaim`. Antes estaba en
  `"prompt"` sin diálogo de actualización, así que los móviles se quedaban
  servidos para siempre con la primera versión cacheada.
- GitHub Pages: manifest con rutas relativas (`start_url`/`scope`/iconos) y
  `dist/404.html` generado en el build como fallback de SPA.
- `.safe-x` ahora garantiza un mínimo de 20px: al estar fuera de las capas de
  Tailwind anulaba `px-4`, y en Android (safe-area = 0) el texto se pegaba al
  borde de la pantalla.
- Estilo Google Maps aplicado en portada, mapa, ficha de parada, itinerario,
  diario, gastos, logros y menú "Más".

## Roadmap siguiente

1. PDF premium del resumen final (usar `html2canvas` para capturar el mapa +
   `jspdf-autotable` para las tablas de gastos/estadísticas).
2. Exportación a Excel de gastos con `xlsx` (ya instalado).
3. Pantalla dedicada "Cerca de mí" con categorías y Overpass API (OSM,
   keyless) para gasolineras/hospitales/supermercados.
4. UI para fijar PIN de bloqueo del editor (el campo `pinHash` del modelo ya
   existe).
5. Ejecutar la suite Playwright completa en CI (`.github/workflows/deploy.yml`
   ya corre los tests unitarios en cada push; añadir un job de E2E).
6. Multi-viaje / cuenta de usuario / sync entre dispositivos (el modelo de
   datos ya es genérico por `Trip.id`, pero la UI solo carga uno).

## Perfil del viaje (referencia rápida)

- Vehículo: Volkswagen Golf 1.9 TDI, negro, ~4.5 L/100km, diésel, 300.000 km
  de partida.
- Viajeros: 2.
- 5 días, 29 agosto – 2 septiembre 2026: Girona→Huesca · Huesca→Pamplona→
  Hondarribia→San Sebastián · Getaria→Zumaia→Gaztelugatxe→Bilbao · Bilbao ·
  Santoña→Santander. Regreso a Girona configurable desde el editor.
