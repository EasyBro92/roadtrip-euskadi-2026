/**
 * Pone coordenadas a los road trips de `roadtrips.def.mjs` SIN conexión, con
 * el nomenclátor de GeoNames (poblaciones de más de 500 habitantes), y escribe
 * `src/data/roadtrips.data.ts`.
 *
 * Existe porque `build-roadtrips.mjs` pregunta a Nominatim y eso sólo se puede
 * lanzar desde un ordenador con salida a internet. Este usa un fichero que
 * viene dentro de un paquete de npm, así que funciona en cualquier sitio. La
 * regla es la misma: ninguna coordenada se escribe de memoria.
 *
 * Lo que GeoNames resuelve son POBLACIONES. Un faro, un castillo suelto o un
 * parque natural no están en este fichero: esas paradas NO se escriben y
 * salen en el informe. `build-roadtrips.mjs` sí las encuentra; al lanzarlo
 * sustituye este resultado por el suyo, más completo.
 *
 * Uso:
 *   npm install --no-save cities-500-structured
 *   node scripts/build-roadtrips-offline.mjs
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { ROADTRIPS } from "./roadtrips.def.mjs";

const SALIDA = new URL("../src/data/roadtrips.data.ts", import.meta.url);
const DATOS = new URL("../node_modules/cities-500-structured/dist/cities500.txt", import.meta.url);

if (!existsSync(DATOS)) {
  console.error("Falta el nomenclátor. Lanza antes:  npm install --no-save cities-500-structured");
  process.exit(1);
}

/** El país tal como se escribe al final de cada consulta → código ISO. */
const PAISES = {
  españa: "ES", portugal: "PT", france: "FR", italia: "IT", deutschland: "DE", "united kingdom": "GB",
  ireland: "IE", österreich: "AT", schweiz: "CH", nederland: "NL", belgië: "BE", hrvatska: "HR",
  slovenija: "SI", ελλάδα: "GR", greece: "GR", norge: "NO", ísland: "IS", iceland: "IS", maroc: "MA",
  morocco: "MA", "česko": "CZ", polska: "PL", magyarország: "HU", "united states": "US", andorra: "AD",
  danmark: "DK", sverige: "SE", türkiye: "TR", montenegro: "ME", "crna gora": "ME", românia: "RO",
  malta: "MT", luxembourg: "LU", japan: "JP", "new zealand": "NZ", australia: "AU", canada: "CA",
  argentina: "AR", chile: "CL", méxico: "MX", "south africa": "ZA", jordan: "JO", cuba: "CU",
};

/**
 * Paradas que son un monumento DENTRO del casco de una población: se sitúan
 * en esa población. Sólo las que están en el propio pueblo; un monasterio a
 * cinco kilómetros no entra aquí, porque el marcador mentiría.
 */
const EN_SU_PUEBLO = {
  "Castillo de Peñafiel": "Peñafiel",
  "Monasterio de Yuso": "San Millán de la Cogolla",
  "Parco Archeologico di Pompei": "Pompei",
  "Château de Chenonceau": "Chenonceaux",
  "Château de Villandry": "Villandry",
  "Château de Chambord": "Chambord",
  "Stirling Castle": "Stirling",
  "Castillo de los Mendoza": "Manzanares el Real",
};

/** Poblaciones que GeoNames guarda con otro nombre que el de uso corriente. */
const OTRO_NOMBRE = {
  "Zahara de la Sierra": "Zahara",
  "Ciutadella de Menorca": "Ciutadella",
  "Caravaca de la Cruz": "Caravaca",
  "Es Mercadal": "Mercadal",
  Marrakech: "Marrakesh",
  Galway: "Gaillimh",
};

/** Salto máximo razonable entre una parada y la más cercana de su ruta. */
const SALTO_MAXIMO_KM = 200;

const normalizar = (texto) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’'`´]/g, "'")
    // "Stow-on-the-Wold" y "Stow on the Wold" son el mismo sitio.
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const PAIS_POR_NOMBRE = new Map(Object.entries(PAISES).map(([nombre, codigo]) => [normalizar(nombre), codigo]));

/** nombre normalizado + país → candidatos */
const indice = new Map();
for (const linea of readFileSync(DATOS, "utf8").split("\n")) {
  const c = linea.split("\t");
  if (c.length < 15) continue;
  const lugar = { nombre: c[1], lat: Number(c[4]), lon: Number(c[5]), pais: c[8], poblacion: Number(c[14]) || 0 };
  const nombres = new Set([c[1], c[2], ...c[3].split(",")].filter(Boolean).map(normalizar));
  for (const n of nombres) {
    const clave = `${lugar.pais}|${n}`;
    const lista = indice.get(clave);
    if (lista) lista.push({ ...lugar, oficial: n === normalizar(c[1]) });
    else indice.set(clave, [{ ...lugar, oficial: n === normalizar(c[1]) }]);
  }
}

function distanciaKm(a, b) {
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function candidatos(consulta) {
  const partes = consulta.split(",").map((p) => p.trim());
  const pais = PAIS_POR_NOMBRE.get(normalizar(partes.at(-1)));
  if (!pais) return { pais: null, lista: [] };
  // "Orreaga/Roncesvalles" y "Donostia-San Sebastián" llevan dos nombres.
  const buscar = EN_SU_PUEBLO[partes[0]] ?? OTRO_NOMBRE[partes[0]] ?? partes[0];
  const variantes = [buscar, ...buscar.split("/"), ...(buscar.includes("-") ? buscar.split("-") : [])].map((v) => v.trim());
  for (const v of variantes) {
    const lista = indice.get(`${pais}|${normalizar(v)}`);
    if (!lista?.length) continue;
    // Si alguna población se llama así de nombre oficial, las que sólo lo
    // tienen de alias sobran.
    const oficiales = lista.filter((c) => c.oficial);
    return { pais, lista: oficiales.length ? oficiales : lista };
  }
  return { pais, lista: [] };
}

const informe = [];
const rutas = [];

for (const ruta of ROADTRIPS) {
  const pendientes = ruta.stops.map(([nombre, consulta, categoria, minutos, dia, descripcion]) => ({
    nombre, categoria, minutos, dia, descripcion, consulta, ...candidatos(consulta), punto: null,
  }));

  // Primera pasada: los nombres que sólo existen una vez en su país.
  for (const p of pendientes) if (p.lista.length === 1) p.punto = p.lista[0];

  // Segunda: los homónimos, por cercanía al resto de la ruta. "San José" hay
  // decenas en España; el de esta ruta es el que queda junto a las demás.
  const fijos = pendientes.filter((p) => p.punto).map((p) => p.punto);
  for (const p of pendientes) {
    if (p.punto || p.lista.length === 0) continue;
    if (fijos.length === 0) {
      // Sin referencia, la más poblada con ese nombre oficial.
      p.punto = [...p.lista].sort((a, b) => Number(b.oficial) - Number(a.oficial) || b.poblacion - a.poblacion)[0];
      informe.push(`REVISAR    ${ruta.id} · ${p.nombre}: homónimos y sin referencia, se tomó la más poblada`);
      continue;
    }
    const lejania = (c) => Math.min(...fijos.map((f) => distanciaKm(f, c)));
    p.punto = [...p.lista].sort((a, b) => lejania(a) - lejania(b))[0];
  }

  /*
   * Una parada sola a cientos de kilómetros del resto es un homónimo: el
   * fichero trae nombres alternativos en muchos idiomas y alguno coincide con
   * un pueblo de otra región. Se descarta en vez de escribir un punto falso.
   * Las rutas largas de verdad lo dicen con `maxSaltoKm` en su definición.
   */
  const tope = ruta.maxSaltoKm ?? SALTO_MAXIMO_KM;
  const resueltos = pendientes.filter((p) => p.punto);
  for (const p of resueltos) {
    const otros = resueltos.filter((o) => o !== p && o.punto);
    if (otros.length === 0) continue;
    const masCercano = Math.min(...otros.map((o) => distanciaKm(o.punto, p.punto)));
    // Si el nombre sólo coincide con un alias (no con el nombre oficial) se
    // le exige estar más cerca: es donde aparecen los homónimos.
    const limite = p.punto.oficial ? tope : Math.min(tope, 120);
    if (masCercano > limite) {
      informe.push(`DESCARTADA ${ruta.id} · ${p.nombre}: lo encontrado queda a ${Math.round(masCercano)} km del resto de la ruta`);
      p.descartada = true;
    }
  }
  for (const p of pendientes) if (p.descartada) p.punto = null;

  const paradas = [];
  for (const p of pendientes) {
    if (!p.pais) {
      informe.push(`SIN PAÍS   ${ruta.id} · ${p.nombre} (${p.consulta})`);
      continue;
    }
    if (p.descartada) continue;
    if (!p.punto) {
      informe.push(`SIN DATOS  ${ruta.id} · ${p.nombre} (${p.consulta})`);
      continue;
    }
    paradas.push([p.nombre, p.categoria, Number(p.punto.lat.toFixed(5)), Number(p.punto.lon.toFixed(5)), p.minutos, p.dia, p.descripcion]);
  }

  // Una ruta con una sola parada no es una ruta: mejor que no salga a que
  // salga coja. Volverá cuando Nominatim resuelva el resto.
  if (paradas.length < 2) {
    informe.push(`FUERA      ${ruta.id}: sólo ${paradas.length} parada(s) resuelta(s)`);
    continue;
  }
  // Los días se renumeran si alguno se quedó sin paradas, para que no haya
  // un "Día 2" vacío en mitad de la ruta.
  const diasConParadas = [...new Set(paradas.map((p) => p[5]))].sort((a, b) => a - b);
  for (const p of paradas) p[5] = diasConParadas.indexOf(p[5]) + 1;
  const { maxSaltoKm: _sinUso, ...limpia } = ruta;
  // "Dolomitas en 5 días" con dos días sin resolver ya no son cinco.
  const name = diasConParadas.length === ruta.days ? ruta.name : ruta.name.replace(/ en \d+ días$/, "");
  rutas.push({ ...limpia, name, days: diasConParadas.length, stops: paradas });
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
  `// ARCHIVO GENERADO por scripts/build-roadtrips-offline.mjs (GeoNames). No editar a mano.
// Las paradas que no son poblaciones faltan: las añade scripts/build-roadtrips.mjs (Nominatim).
import type { RoadtripCrudo } from "./roadtrips.tipos";

export const ROADTRIPS_CRUDOS: RoadtripCrudo[] = [
${cuerpo}
];
`,
);

const total = rutas.reduce((n, r) => n + r.stops.length, 0);
console.error(`\n${rutas.length} rutas, ${total} paradas escritas en src/data/roadtrips.data.ts`);
if (informe.length) console.error(`\n${informe.length} avisos:\n${informe.join("\n")}`);
