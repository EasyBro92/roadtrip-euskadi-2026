/**
 * Script puntual: resuelve las coordenadas de las paradas del catálogo de
 * rutas contra Nominatim, para no escribirlas a mano ni de memoria. La salida
 * se pega en src/data/routeTemplates.data.ts ya verificada.
 *
 * Respeta la política de uso de Nominatim: un User-Agent identificable y una
 * petición por segundo como máximo.
 */
const CONSULTAS = [
  // Costa Brava
  ["Girona", "Girona, Catalunya, España"],
  ["Tossa de Mar", "Tossa de Mar, Girona, España"],
  ["Calella de Palafrugell", "Calella de Palafrugell, Girona, España"],
  ["Begur", "Begur, Girona, España"],
  ["Cadaqués", "Cadaqués, Girona, España"],
  ["Cap de Creus", "Cap de Creus, Cadaqués, Girona, España"],
  // Picos de Europa
  ["Cangas de Onís", "Cangas de Onís, Asturias, España"],
  ["Covadonga", "Covadonga, Cangas de Onís, Asturias, España"],
  ["Lagos de Covadonga", "Lago Enol, Cangas de Onís, Asturias, España"],
  ["Arenas de Cabrales", "Arenas de Cabrales, Asturias, España"],
  ["Potes", "Potes, Cantabria, España"],
  ["Fuente Dé", "Fuente Dé, Camaleño, Cantabria, España"],
];

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

for (const [etiqueta, consulta] of CONSULTAS) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(consulta)}&format=jsonv2&limit=1`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "EasyTravel/1.0 (catalogo de rutas)" } });
    const datos = await res.json();
    if (!datos.length) {
      console.log(`${etiqueta.padEnd(24)} SIN RESULTADO`);
    } else {
      const { lat, lon, display_name } = datos[0];
      console.log(`${etiqueta.padEnd(24)} ${Number(lat).toFixed(4)}, ${Number(lon).toFixed(4)}   ← ${display_name.slice(0, 60)}`);
    }
  } catch (error) {
    console.log(`${etiqueta.padEnd(24)} ERROR ${error.message}`);
  }
  await dormir(1100);
}
