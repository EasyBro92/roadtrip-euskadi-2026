# Limitaciones conocidas y datos demo

Este documento existe para que nunca haya duda sobre qué es real, qué es
estimación del usuario y qué es un dato de ejemplo (sección 50 del encargo).

## Datos marcados explícitamente como "demo"

Buscables por `source: "demo"` en el modelo de datos. Aparecen con la
etiqueta "Demo" en la ficha de la parada:

- Precios de restaurantes, hoteles alternativos y aparcamientos del
  itinerario semilla (`src/data/stops.data.ts`). Son estimaciones de
  referencia, no precios verificados a fecha de hoy.
- Horarios y disponibilidad de visitas guiadas de estadios: marcados con
  `infoPendingVerification: true`, nunca con un horario inventado.

## Nunca inventado, aunque quede vacío

- **Coste real de combustible / consumo real**: solo existen si el usuario
  registra repostajes. Sin repostajes, `VehicleService` devuelve `null` en
  vez de un número inventado (ver `tests/services/VehicleService.test.ts`).
- **Distancia y duración por carretera**: si ningún proveedor de rutas
  responde, se dibuja una línea recta y el segmento se marca
  `isFallback: true` — la UI lo indica como ruta aproximada, nunca como
  datos reales.
- **Peajes**: `hasTolls` es `null` salvo que el proveedor de rutas lo informe
  explícitamente.
- **"Cerca de mí"**: sin `VITE_PLACES_API_KEY`, algunas categorías (gasolineras,
  supermercados, farmacias vía Overpass/OSM) sí son reales; el resto se
  etiqueta "Demo".

## Fuera de alcance en esta versión (documentado, no implementado)

- **Descarga masiva de teselas de mapa offline**: por política de uso de
  OpenStreetMap, no se descargan teselas en bloque. El Service Worker las
  cachea de forma incremental según se visitan (`CacheFirst`, ver
  `vite.config.ts`). El paquete offline sí incluye itinerario, textos, fotos
  propias y rutas ya calculadas.
- **Enlace público para compartir**: sin backend propio no existe URL
  pública real. Se ofrece exportar/importar JSON y un QR con los datos
  comprimidos (con aviso si no cabe).
- **PDF premium del resumen final e informe con mapa**: la exportación JSON
  del resumen funciona ahora; el PDF con maquetación completa (portada,
  mapa capturado, estadísticas) queda para la fase siguiente (ver
  DECISIONS.md).
- **Excel de gastos**: `xlsx` está instalado y preparado; la exportación CSV
  está completa y funcional ahora mismo como alternativa inmediata.
- **Playwright E2E**: los 15 escenarios de la sección 51 están escritos en
  `e2e/main-flows.spec.ts` y listos para ejecutar, pero no se han corrido
  navegadores de Playwright en este entorno (`npx playwright install` la
  primera vez).

## Aproximaciones geográficas

Las coordenadas de las paradas del itinerario semilla están tomadas de
conocimiento geográfico general de lugares muy conocidos (Guggenheim, San
Mamés, Playa de la Concha, Castillo de Loarre...). Son suficientemente
precisas para marcar la ubicación en el mapa, pero no proceden de una API de
geocodificación verificada — edítalas desde el editor de ruta si necesitas
precisión exacta para navegación real.
