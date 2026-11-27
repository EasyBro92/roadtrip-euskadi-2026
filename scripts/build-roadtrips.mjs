/**
 * Script puntual: pone coordenadas a los road trips de `roadtrips.def.mjs`
 * preguntando a Nominatim, y escribe `src/data/roadtrips.data.ts`.
 *
 * Respeta la política de uso de Nominatim: User-Agent identificable y una
 * petición por segundo como máximo. Son ~200 consultas: unos 4 minutos.
 *
 * Una parada que Nominatim no encuentra NO se escribe: sale en el informe
 * para corregir su consulta y volver a lanzar el script.
 *
 * Uso:  node scripts/build-roadtrips.mjs
 */
import { writeFileSync } from "node:fs";
import { ROADTRIPS } from "./roadtrips.def.mjs";

const SALIDA = new URL("../src/data/roadtrips.data.ts", import.meta.url);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function distanciaKm(a, b) {
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

async function geocodificar(consulta) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(consulta)}&format=jsonv2&limit=1`;
  const res = await fetch(url, { headers: { "User-Agent": "EasyTravel/1.0 (catalogo de road trips)" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const datos = await res.json();
  if (!datos.length) return null;
  return { lat: Number(Number(datos[0].lat).toFixed(5)), lon: Number(Number(datos[0].lon).toFixed(5)), nombre: datos[0].display_name };
}

const informe = [];
const rutas = [];

for (const ruta of ROADTRIPS) {
  const paradas = [];
  for (const [nombre, consulta, categoria, minutos, dia, descripcion] of ruta.stops) {
    let punto = null;
    try {
      punto = await geocodificar(consulta);
    } catch (error) {
      informe.push(`ERROR      ${ruta.id} · ${nombre}: ${error.message}`);
    }
    if (!punto) {
      informe.push(`SIN DATOS  ${ruta.id} · ${nombre} (${consulta})`);
    } else {
      const anterior = paradas.at(-1);
      // Un salto enorme entre dos paradas seguidas casi siempre es un
      // homónimo en otro país: se avisa para revisarlo a mano.
      if (anterior && distanciaKm([anterior[2], anterior[3]], [punto.lat, punto.lon]) > 350) {
        informe.push(`REVISAR    ${ruta.id} · ${nombre}: a más de 350 km de la parada anterior (${punto.nombre.slice(0, 70)})`);
      }
      paradas.push([nombre, categoria, punto.lat, punto.lon, minutos, dia, descripcion]);
      console.error(`ok  ${nombre.padEnd(28)} ${punto.lat}, ${punto.lon}  ← ${punto.nombre.slice(0, 60)}`);
    }
    await dormir(1100);
  }
  rutas.push({ ...ruta, stops: paradas });
}

const cuerpo = rutas
  .map((r) => {
    const paradas = r.stops.map((p) => `      ${JSON.stringify(p)},`).join("\n");
    return `  {
    id: ${JSON.stringify(r.id)},
    name: ${JSON.stringify(r.name)},
    region: ${JSON.stringify(r.region)},
    country: ${JSON.stringify(r.country)},
    tipo: ${JSON.stringify(r.tipo)},
    tags: ${JSON.stringify(r.tags)},
    summary: ${JSON.stringify(r.summary)},
    days: ${r.days},
    stops: [
${paradas}
    ],
  },`;
  })
  .join("\n");

writeFileSync(
  SALIDA,
  `// ARCHIVO GENERADO por scripts/build-roadtrips.mjs a partir de
// scripts/roadtrips.def.mjs. Las coordenadas vienen de Nominatim
// (OpenStreetMap), no de memoria. No lo edites a mano: cambia la definición
// y vuelve a lanzar el script.
import type { RoadtripCrudo } from "./roadtrips.tipos";

export const ROADTRIPS_CRUDOS: RoadtripCrudo[] = [
${cuerpo}
];
`,
);

console.log(`\n${rutas.length} rutas, ${rutas.reduce((n, r) => n + r.stops.length, 0)} paradas escritas en src/data/roadtrips.data.ts`);
console.log(informe.length ? `\nPara revisar:\n${informe.join("\n")}` : "\nTodo encontrado, sin avisos.");
