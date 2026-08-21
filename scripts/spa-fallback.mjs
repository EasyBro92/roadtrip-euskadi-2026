/*
 * GitHub Pages no permite reescrituras de servidor, así que al recargar en
 * una ruta profunda (p. ej. /roadtrip-euskadi-2026/itinerario) devuelve 404
 * en vez de servir la SPA. El truco estándar es publicar una copia de
 * index.html como 404.html: Pages la sirve ante cualquier ruta desconocida y
 * React Router se encarga del resto. En Netlify/Vercel/nginx sobra, pero no
 * molesta.
 */
import { copyFile } from "node:fs/promises";

await copyFile("dist/index.html", "dist/404.html");
console.log("SPA fallback: dist/404.html creado a partir de index.html");
