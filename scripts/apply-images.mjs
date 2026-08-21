// Script puntual: inyecta `heroImage` en stops.data.ts y optionalPlaces.data.ts
// a partir de scripts/place-images.json (URLs de Wikimedia Commons).
import fs from "node:fs/promises";

const images = JSON.parse(await fs.readFile("scripts/place-images.json", "utf-8"));

for (const file of ["src/data/stops.data.ts", "src/data/optionalPlaces.data.ts"]) {
  let source = await fs.readFile(file, "utf-8");
  let applied = 0;

  for (const [id, url] of Object.entries(images)) {
    if (!url) continue;
    // Solo tocar la entrada cuyo id coincide, y solo si no tiene ya heroImage.
    const idPattern = new RegExp(`(id: "${id}",\\n)`, "g");
    if (!idPattern.test(source)) continue;
    idPattern.lastIndex = 0;

    // Comprobar si ese bloque ya define heroImage (mirando hasta el siguiente `id: "`).
    const start = source.indexOf(`id: "${id}",`);
    const nextId = source.indexOf('id: "', start + 5);
    const block = source.slice(start, nextId === -1 ? undefined : nextId);
    if (block.includes("heroImage:")) continue;

    const indentMatch = source.slice(0, start).match(/\n(\s*)$/);
    const indent = indentMatch ? indentMatch[1] : "    ";
    source = source.slice(0, start) + `id: "${id}",\n${indent}heroImage: "${url}",` + source.slice(start + `id: "${id}",`.length);
    applied++;
  }

  await fs.writeFile(file, source);
  console.log(`${file}: ${applied} heroImage añadidos`);
}
