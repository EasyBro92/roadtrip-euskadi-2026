// Script puntual: combina Wikipedia summary + búsqueda en Wikimedia Commons
// para encontrar una foto real por lugar, evitando banderas/escudos/mapas.
const ENTRIES = [
  ["stop-girona", "Girona", "Girona catedral"],
  ["stop-castillo-loarre", "Castillo de Loarre", "Castillo de Loarre"],
  ["stop-huesca", "Huesca", "Huesca catedral"],
  ["stop-el-sadar", "Estadio El Sadar", "El Sadar"],
  ["stop-calle-estafeta", "Calle Estafeta", "Estafeta Pamplona"],
  ["stop-pamplona-centro", "Pamplona", "Plaza del Castillo Pamplona"],
  ["stop-hondarribia", "Hondarribia", "Hondarribia marina"],
  ["stop-monte-igueldo", "Monte Igueldo", "Igueldo"],
  ["stop-playa-concha", "Playa de la Concha", "Concha San Sebastian bahia"],
  ["stop-peine-viento", "Peine del Viento", "Peine del Viento Chillida"],
  ["stop-parte-vieja-ss", "Parte Vieja (San Sebastián)", "Parte Vieja Donostia"],
  ["stop-reale-arena", "Reale Arena", "Anoeta stadium"],
  ["stop-getaria", "Getaria", "Getaria puerto"],
  ["stop-puerto-viejo-getaria", "Getaria", "Getaria puerto"],
  ["stop-getaria-casco", "Getaria", "Getaria"],
  ["stop-playa-itzurun", "Playa de Itzurun", "Itzurun Zumaia"],
  ["stop-flysch-zumaia", "Flysch de Zumaia", "Flysch Zumaia"],
  ["stop-gaztelugatxe", "San Juan de Gaztelugatxe", "Gaztelugatxe"],
  ["stop-guggenheim", "Museo Guggenheim Bilbao", "Guggenheim Bilbao"],
  ["stop-mercado-ribera", "Mercado de la Ribera", "Mercado Ribera Bilbao"],
  ["stop-casco-viejo-bilbao", "Casco Viejo (Bilbao)", "Casco Viejo Bilbao"],
  ["stop-siete-calles", "Casco Viejo (Bilbao)", "Siete Calles Bilbao"],
  ["stop-san-mames", "San Mamés", "San Mames stadium"],
  ["stop-funicular-artxanda", "Funicular de Artxanda", "Funicular Artxanda"],
  ["stop-mirador-artxanda", "Artxanda", "Artxanda Bilbao"],
  ["stop-santona", "Santoña", "Santoña puerto"],
  ["stop-palacio-magdalena", "Palacio de la Magdalena", "Palacio Magdalena Santander"],
  ["stop-barrio-pesquero", "Santander (España)", "Santander puerto"],
  ["stop-el-sardinero", "El Sardinero", "Sardinero Santander"],
  ["stop-santander", "Santander (España)", "Santander bahia"],
  ["place-castro-urdiales", "Castro Urdiales", "Castro Urdiales"],
  ["place-laredo", "Laredo (Cantabria)", "Laredo Cantabria playa"],
  ["place-faro-cabo-mayor", "Faro de Cabo Mayor", "Cabo Mayor faro"],
  ["place-santander-centro", "Santander (España)", "Santander centro"],
  ["place-mundaka", "Mundaka", "Mundaka ria"],
  ["place-bermeo", "Bermeo", "Bermeo puerto"],
  ["place-puente-colgante", "Puente de Vizcaya", "Puente Colgante Portugalete"],
  ["place-olite", "Olite", "Palacio Real Olite"],
  ["place-ujue", "Ujué", "Ujue Navarra"],
  ["place-zugarramurdi", "Cuevas de Zugarramurdi", "Zugarramurdi cueva"],
  ["place-pasajes-san-juan", "Pasaia", "Pasai Donibane"],
  ["place-deba", "Deba", "Deba Gipuzkoa"],
  ["place-elantxobe", "Elantxobe", "Elantxobe puerto"],
  ["place-playa-laga", "Laga (playa)", "Playa Laga"],
  ["place-santillana-del-mar", "Santillana del Mar", "Santillana del Mar"],
  ["place-comillas", "Comillas", "Comillas El Capricho"],
];

const BLOCKED = ["bandera", "flag", "escudo", "coat_of_arms", "shield", "mapa_", "_map", "location_", "ubicaci", "situaci", "blason", "locator", "logo", "escut"];

function isPhoto(title, mime) {
  const t = title.toLowerCase();
  if (!mime || !mime.startsWith("image/") || mime === "image/svg+xml") return false;
  return !BLOCKED.some((w) => t.includes(w));
}

async function wikiSummary(title) {
  try {
    const res = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, { headers: { "User-Agent": "rt-euskadi-script/1.0" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.type === "disambiguation") return null;
    const src = data.originalimage?.source ?? data.thumbnail?.source ?? null;
    if (!src) return null;
    return isPhoto(src, src.endsWith(".svg") ? "image/svg+xml" : "image/jpeg") ? src : null;
  } catch {
    return null;
  }
}

async function commonsSearch(query) {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=10&prop=imageinfo&iiprop=url|mime&iiurlwidth=900&format=json&origin=*`;
    const res = await fetch(url, { headers: { "User-Agent": "rt-euskadi-script/1.0" } });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return null;
    for (const page of Object.values(pages)) {
      const info = page.imageinfo?.[0];
      if (info && isPhoto(page.title, info.mime)) return info.thumburl ?? info.url;
    }
    return null;
  } catch {
    return null;
  }
}

const results = {};
for (const [id, wikiTitle, commonsQuery] of ENTRIES) {
  let image = await wikiSummary(wikiTitle);
  if (!image) image = await commonsSearch(commonsQuery);
  if (!image) image = await commonsSearch(wikiTitle);
  results[id] = image;
  console.log(id, "->", image ?? "NOT FOUND");
  await new Promise((r) => setTimeout(r, 100));
}

await import("node:fs/promises").then((fs) => fs.writeFile("scripts/place-images.json", JSON.stringify(results, null, 2)));
const missing = Object.entries(results).filter(([, v]) => !v).length;
console.log(`Done. ${Object.keys(results).length - missing}/${Object.keys(results).length} found.`);
