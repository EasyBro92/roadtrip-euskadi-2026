import fs from "node:fs/promises";

const ALL_QUERIES = {
  "stop-girona": ["Girona", "Girona ciudad"],
  "stop-castillo-loarre": ["Castillo de Loarre", "Loarre"],
  "stop-huesca": ["Huesca", "Huesca catedral"],
  "stop-calle-estafeta": ["Calle Estafeta", "Estafeta Pamplona"],
  "stop-pamplona-centro": ["Pamplona", "Plaza del Castillo"],
  "stop-hondarribia": ["Hondarribia", "Fuenterrabia"],
  "stop-monte-igueldo": ["Monte Igueldo", "Igueldo"],
  "stop-playa-concha": ["Playa de la Concha", "La Concha San Sebastian"],
  "stop-parte-vieja-ss": ["Parte Vieja San Sebastian", "Alde Zaharra Donostia"],
  "stop-playa-itzurun": ["Itzurun", "Playa Itzurun"],
  "stop-barrio-pesquero": ["Puerto pesquero Santander", "Puertochico Santander"],
  "stop-el-sardinero": ["El Sardinero", "Sardinero playa"],
  "stop-santander": ["Santander bahia", "Bahia de Santander"],
  "place-castro-urdiales": ["Castro Urdiales", "Castro Urdiales puerto"],
  "place-laredo": ["Laredo Cantabria", "Puebla Vieja Laredo"],
  "place-faro-cabo-mayor": ["Cabo Mayor", "Faro Cabo Mayor"],
  "place-santander-centro": ["Santander Ayuntamiento", "Santander Pereda"],
  "place-mundaka": ["Mundaka", "Mundaka surf"],
  "place-bermeo": ["Bermeo", "Bermeo puerto pesquero"],
  "place-puente-colgante": ["Puente Bizkaia", "Puente Colgante Getxo"],
  "place-olite": ["Olite castillo", "Palacio Real Olite"],
  "place-ujue": ["Ujue", "Uxue"],
  "place-zugarramurdi": ["Zugarramurdi", "Cueva Zugarramurdi"],
  "place-pasajes-san-juan": ["Pasai Donibane", "Pasajes San Juan"],
  "place-deba": ["Deba", "Deba playa"],
  "place-elantxobe": ["Elantxobe", "Elantxobe Ogono"],
  "place-playa-laga": ["Laga", "Playa Laga Ibarrangelu"],
  "place-santillana-del-mar": ["Santillana del Mar", "Santillana Mar plaza"],
  "place-comillas": ["Comillas Cantabria", "Capricho de Gaudi Comillas"],
};

const BLOCKED = ["bandera", "flag", "escudo", "coat_of_arms", "shield", "mapa_", "_map", "location_", "ubicaci", "situaci", "blason", "locator", "logo", "escut"];
function isPhoto(title, mime) {
  const t = title.toLowerCase();
  if (!mime || !mime.startsWith("image/") || mime === "image/svg+xml") return false;
  return !BLOCKED.some((w) => t.includes(w));
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": "roadtrip-euskadi-2026/1.0 (personal travel app; contact: n/a)" } });
    if (res.status === 429) {
      await sleep(3000 * (attempt + 1));
      continue;
    }
    if (!res.ok) return null;
    return res.json();
  }
  return null;
}

async function commonsSearch(query) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=10&prop=imageinfo&iiprop=url|mime&iiurlwidth=900&format=json&origin=*`;
  const data = await fetchWithRetry(url);
  const pages = data?.query?.pages;
  if (!pages) return null;
  for (const page of Object.values(pages)) {
    const info = page.imageinfo?.[0];
    if (info && isPhoto(page.title, info.mime)) return info.thumburl ?? info.url;
  }
  return null;
}

const existing = JSON.parse(await fs.readFile("scripts/place-images.json", "utf-8"));
let foundCount = 0;

for (const [id, queries] of Object.entries(ALL_QUERIES)) {
  if (existing[id]) continue;
  let image = null;
  for (const q of queries) {
    image = await commonsSearch(q);
    if (image) break;
    await sleep(700);
  }
  existing[id] = image;
  console.log(id, "->", image ?? "still not found");
  if (image) foundCount++;
  await sleep(700);
}

await fs.writeFile("scripts/place-images.json", JSON.stringify(existing, null, 2));
console.log(`Newly found: ${foundCount}`);
