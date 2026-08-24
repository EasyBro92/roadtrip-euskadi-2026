/**
 * Script puntual: monta el catálogo de rutas de Explorar.
 *
 * Usa el mismo método que el generador de la app (Overpass filtrado por
 * Wikidata + relevancia por número de idiomas en Wikipedia), pero se ejecuta
 * **una vez aquí** y su salida se pega ya verificada en
 * src/data/routeTemplates.data.ts. Así el catálogo funciona sin conexión y no
 * castiga a Overpass cada vez que alguien abre Explorar.
 *
 * Repite la lógica del servicio a propósito: los scripts de este proyecto son
 * autónomos (ver fetch-place-images.mjs) y no comparten código con src/.
 *
 * Uso:  node scripts/build-route-catalog.mjs > /tmp/catalogo.json
 */

const DESTINOS = [
  ["Madrid", "Madrid, España", 3],
  ["Barcelona", "Barcelona, España", 3],
  ["Sevilla", "Sevilla, España", 3],
  ["Valencia", "Valencia, España", 3],
  ["Granada", "Granada, España", 2],
  ["Bilbao", "Bilbao, España", 2],
  ["San Sebastián", "Donostia-San Sebastián, España", 2],
  ["Santiago de Compostela", "Santiago de Compostela, España", 2],
  ["Córdoba", "Córdoba, España", 2],
  ["Toledo", "Toledo, España", 2],
  ["Salamanca", "Salamanca, España", 2],
  ["Segovia", "Segovia, España", 2],
  ["Málaga", "Málaga, España", 3],
  ["Cádiz", "Cádiz, España", 2],
  ["Zaragoza", "Zaragoza, España", 2],
  ["Oviedo", "Oviedo, España", 2],
  ["Santander", "Santander, España", 2],
  ["Palma de Mallorca", "Palma, Illes Balears, España", 3],
  ["Valladolid", "Valladolid, España", 2],
  ["Cuenca", "Cuenca, España", 2],
  ["Lisboa", "Lisboa, Portugal", 3],
  ["Oporto", "Porto, Portugal", 3],
  ["París", "Paris, Francia", 4],
  ["Roma", "Roma, Italia", 4],
  ["Florencia", "Firenze, Italia", 3],
  ["Venecia", "Venezia, Italia", 3],
  ["Ámsterdam", "Amsterdam, Países Bajos", 3],
  ["Berlín", "Berlin, Alemania", 3],
  ["Praga", "Praha, Chequia", 3],
  ["Viena", "Wien, Austria", 3],
  ["Londres", "London, Reino Unido", 4],
  ["Edimburgo", "Edinburgh, Reino Unido", 3],
];

const INTERESES = {
  cultura: { osm: '["tourism"~"museum|gallery"]', categoria: "cultura", minutos: 120 },
  monumentos: { osm: '["historic"~"castle|monument|memorial|ruins|city_gate"]', categoria: "historia", minutos: 60 },
  gastronomia: { osm: '["amenity"~"restaurant|cafe|bar"]', categoria: "gastronomia", minutos: 90 },
  naturaleza: { osm: '["leisure"~"park|nature_reserve"]', categoria: "naturaleza", minutos: 90 },
};

const BLOQUEADOS = ["bandera", "flag", "escudo", "mapa_", "_map", "logo"];
const RADIO = 4000;
const PARADAS_POR_DIA = 4;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function haversine(a, b) {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const la1 = (a.latitude * Math.PI) / 180;
  const la2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function geocodificar(consulta) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(consulta)}&format=jsonv2&limit=1`;
  const r = await fetch(url, { headers: { "User-Agent": "EasyTravel-catalog/1.0" } });
  const j = await r.json();
  if (!j.length) return null;
  return { latitude: Number(j[0].lat), longitude: Number(j[0].lon) };
}

async function buscar(interes, centro) {
  const { osm, categoria, minutos } = INTERESES[interes];
  const cerca = `(around:${RADIO},${centro.latitude},${centro.longitude})`;
  const partes = ["node", "way", "relation"].map((t) => `${t}${osm}["wikidata"]["name"]${cerca};`).join("");
  const q = `[out:json][timeout:40];(${partes});out center 60;`;

  const r = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(q)}`,
  });
  if (!r.ok) return [];
  const d = await r.json();

  const vistos = new Set();
  const out = [];
  for (const el of d.elements ?? []) {
    const nombre = el.tags?.name;
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!nombre || lat == null || lon == null) continue;
    if (BLOQUEADOS.some((b) => nombre.toLowerCase().includes(b))) continue;
    if (vistos.has(nombre)) continue;
    vistos.add(nombre);
    out.push({ name: nombre, category: categoria, coordinates: { latitude: lat, longitude: lon }, recommendedDurationMinutes: minutos, wikidata: el.tags.wikidata });
  }
  return out;
}

async function puntuar(paradas) {
  const ids = [...new Set(paradas.map((p) => p.wikidata).filter(Boolean))].slice(0, 50);
  if (!ids.length) return;
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.join("|")}&props=sitelinks&format=json`;
  const r = await fetch(url, { headers: { "User-Agent": "EasyTravel-catalog/1.0" } });
  const d = await r.json();
  const porId = new Map();
  for (const [id, e] of Object.entries(d.entities ?? {})) porId.set(id, Object.keys(e.sitelinks ?? {}).length);
  for (const p of paradas) p.relevancia = porId.get(p.wikidata) ?? 0;
}

function encadenar(paradas, desde) {
  const pend = [...paradas];
  const ruta = [];
  let actual = desde;
  while (pend.length) {
    let mejor = 0;
    let dist = Infinity;
    pend.forEach((p, i) => {
      const d = haversine(actual, p.coordinates);
      if (d < dist) { dist = d; mejor = i; }
    });
    const [e] = pend.splice(mejor, 1);
    ruta.push(e);
    actual = e.coordinates;
  }
  return ruta;
}

const catalogo = [];

for (const [nombre, consulta, dias] of DESTINOS) {
  const centro = await geocodificar(consulta);
  await dormir(1200);
  if (!centro) {
    console.error(`SIN GEOCODIFICAR: ${nombre}`);
    continue;
  }

  const candidatas = [];
  for (const interes of ["cultura", "monumentos", "gastronomia", "naturaleza"]) {
    candidatas.push(...(await buscar(interes, centro)));
    await dormir(1500);
  }
  if (!candidatas.length) {
    console.error(`SIN RESULTADOS: ${nombre}`);
    continue;
  }

  await puntuar(candidatas);
  await dormir(800);

  const total = Math.min(candidatas.length, PARADAS_POR_DIA * dias);
  const porCat = new Map();
  for (const c of candidatas) porCat.set(c.category, [...(porCat.get(c.category) ?? []), c]);
  for (const l of porCat.values()) l.sort((a, b) => (b.relevancia ?? 0) - (a.relevancia ?? 0));

  const elegidas = [];
  let quedan = true;
  while (elegidas.length < total && quedan) {
    quedan = false;
    for (const l of porCat.values()) {
      const s = l.shift();
      if (!s) continue;
      quedan = true;
      elegidas.push(s);
      if (elegidas.length >= total) break;
    }
  }

  const ordenadas = encadenar(elegidas, centro);
  catalogo.push({
    nombre,
    dias,
    paradas: ordenadas.map((p, i) => ({
      name: p.name,
      category: p.category,
      coordinates: { latitude: Number(p.coordinates.latitude.toFixed(5)), longitude: Number(p.coordinates.longitude.toFixed(5)) },
      recommendedDurationMinutes: p.recommendedDurationMinutes,
      dayIndex: Math.floor(i / PARADAS_POR_DIA) + 1,
      relevancia: p.relevancia ?? 0,
    })),
  });
  console.error(`OK ${nombre}: ${ordenadas.length} paradas`);
}

console.log(JSON.stringify(catalogo, null, 1));
