import type { Expense, Note, Stop, Trip } from "../../types";
import { formatDateLong, formatEUR } from "../../utils/format";
import { triggerDownload } from "../../utils/download";
import { nombreArchivo } from "../../utils/nombreArchivo";
import { db, type StoredPhoto } from "../storage/db";

/*
 * Tamaño de las fotos dentro del álbum.
 *
 * Las guardadas son de 1600 px, y metidas tal cual en base64 un viaje con
 * doscientas fotos da un fichero de decenas de megas que no pasa por WhatsApp.
 * A 1100 px se ve bien a pantalla completa en cualquier móvil y el álbum
 * entero pesa lo que pesa un vídeo corto. Las originales siguen enteras en la
 * app y se bajan aparte con el ZIP de fotos.
 */
const ANCHO_ALBUM_PX = 1100;
const CALIDAD_ALBUM = 0.72;

export interface ResumenAlbum {
  fotos: number;
  bytes: number;
  /** Portadas de Wikimedia que no se pudieron traer y siguen siendo enlaces. */
  sinIncrustar: number;
}

/** Escapa lo que va dentro del HTML: los nombres y las notas los escribe el usuario. */
function esc(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Reduce una foto guardada al tamaño del álbum y la devuelve como data URL. */
async function aDataUrl(blob: Blob): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  const escala = Math.min(1, ANCHO_ALBUM_PX / Math.max(bitmap.width, bitmap.height));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar la foto para el álbum");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", CALIDAD_ALBUM);
}

const ESTRELLAS = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

/**
 * Mete dentro del fichero una imagen que vive en internet.
 *
 * Las portadas de las paradas son fotos de Wikimedia, es decir enlaces. Un
 * álbum con enlaces no es un álbum: el día que Wikimedia mueva el fichero, o
 * simplemente sin cobertura, queda un hueco blanco. Se descargan y se meten
 * dentro como las tuyas.
 *
 * Si alguna no se puede traer — sin conexión, o el servidor no deja —, se
 * queda el enlace y se cuenta, para poder decirlo en vez de fingir que el
 * álbum está completo.
 */
async function embeber(url: string): Promise<{ src: string; incrustada: boolean }> {
  if (url.startsWith("data:")) return { src: url, incrustada: true };
  try {
    const respuesta = await fetch(url, { mode: "cors" });
    if (!respuesta.ok) throw new Error(String(respuesta.status));
    return { src: await aDataUrl(await respuesta.blob()), incrustada: true };
  } catch {
    return { src: url, incrustada: false };
  }
}

interface DatosAlbum {
  trip: Trip;
  stopsById: Record<string, Stop>;
  notes: Note[];
  expenses: Expense[];
  /** Las estrellas que pusiste a cada parada, 0 si ninguna. */
  estrellasDe: (stopId: string) => number;
}

export const AlbumService = {
  /** Cuántas fotos tuyas hay en el viaje, para avisar antes de generar nada. */
  async resumen(trip: Trip): Promise<ResumenAlbum> {
    const fotos = await fotosDelViaje(trip);
    return { fotos: fotos.length, bytes: fotos.reduce((s, f) => s + (f.blob?.size ?? 0), 0), sinIncrustar: 0 };
  },

  /**
   * El viaje entero como una sola página web que se abre sin la app.
   *
   * Un fichero suelto y sin nada fuera: ni conexión, ni servidor, ni la app
   * instalada. Se manda por WhatsApp o se guarda en un cajón y dentro de diez
   * años se seguirá abriendo, que es más de lo que se puede decir de una
   * cuenta en un servicio de fotos.
   */
  async descargarHtml({ trip, stopsById, notes, expenses, estrellasDe }: DatosAlbum): Promise<ResumenAlbum> {
    const fotos = await fotosDelViaje(trip);

    // Las fotos, ya reducidas, agrupadas por el día al que pertenecen.
    const porDia = new Map<string, string[]>();
    let usadas = 0;
    for (const foto of fotos) {
      if (!foto.blob || !foto.dayId) continue;
      const url = await aDataUrl(foto.blob);
      porDia.set(foto.dayId, [...(porDia.get(foto.dayId) ?? []), url]);
      usadas++;
    }

    const notaDe = (tipo: "day" | "stop", id: string) => notes.find((n) => n.targetType === tipo && n.targetId === id)?.text?.trim();

    let sinIncrustar = 0;

    const dias = await Promise.all(
      trip.days.map(async (dia) => {
        const paradas = dia.stopIds.map((id) => stopsById[id]).filter((s): s is Stop => Boolean(s) && s.enabled);
        const gasto = expenses.filter((e) => e.dayId === dia.id && e.kind === "actual").reduce((s, e) => s + e.amountEUR, 0);
        const fotosDelDia = porDia.get(dia.id) ?? [];
        const original = fotosDelDia[0] ?? paradas.find((p) => p.heroImage)?.heroImage;
        const portada = original ? await embeber(original) : null;
        if (portada && !portada.incrustada) sinIncrustar++;

        const listaParadas = paradas
          .map((p) => {
            const estrellas = estrellasDe(p.id);
            const nota = notaDe("stop", p.id);
            return `<li${p.visited ? ' class="visitada"' : ""}>
              <h3>${esc(p.name)}</h3>
              <p class="meta">${esc(p.category)}${estrellas > 0 ? ` · <span class="estrellas">${ESTRELLAS(estrellas)}</span>` : ""}</p>
              ${nota ? `<p class="nota">${esc(nota)}</p>` : ""}
            </li>`;
          })
          .join("");

        const notaDia = notaDe("day", dia.id);

        return `<section class="dia">
          ${portada ? `<img class="portada" src="${portada.src}" alt="">` : ""}
          <div class="cabecera">
            <p class="etiqueta">Día ${dia.index + 1} · ${esc(formatDateLong(dia.date))}</p>
            <h2>${esc(dia.title || dia.city || `Día ${dia.index + 1}`)}</h2>
            <p class="meta">${paradas.length} ${paradas.length === 1 ? "parada" : "paradas"}${gasto > 0 ? ` · ${esc(formatEUR(gasto))}` : ""}</p>
          </div>
          ${notaDia ? `<p class="relato">${esc(notaDia)}</p>` : ""}
          <ol class="paradas">${listaParadas}</ol>
          ${fotosDelDia.length > 1 ? `<div class="galeria">${fotosDelDia.slice(1).map((f) => `<img src="${f}" alt="" loading="lazy">`).join("")}</div>` : ""}
        </section>`;
      }),
    ).then((partes) => partes.join(""));

    const visitadas = Object.values(stopsById).filter((s) => s.visited).length;
    const totalGasto = expenses.filter((e) => e.kind === "actual").reduce((s, e) => s + e.amountEUR, 0);

    const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(trip.name)}</title>
<style>
  :root { color-scheme: light dark; --tinta:#202124; --suave:#5f6368; --fondo:#fafaf7; --carta:#fff; --borde:#e8eaed; }
  @media (prefers-color-scheme: dark) { :root { --tinta:#e8eaed; --suave:#9aa5b1; --fondo:#0f1419; --carta:#17212b; --borde:#2c3a47; } }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--fondo); color:var(--tinta); font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
  .hoja { max-width:720px; margin:0 auto; padding:0 0 64px; }
  header.viaje { padding:48px 20px 32px; text-align:center; }
  header.viaje h1 { margin:0 0 6px; font-size:32px; letter-spacing:-.02em; }
  .dia { background:var(--carta); border:1px solid var(--borde); border-radius:22px; overflow:hidden; margin:0 16px 20px; }
  .portada { display:block; width:100%; height:220px; object-fit:cover; }
  .cabecera { padding:18px 20px 4px; }
  .cabecera h2 { margin:2px 0 4px; font-size:22px; letter-spacing:-.01em; }
  .etiqueta { margin:0; font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:var(--suave); }
  .meta { margin:0; font-size:14px; color:var(--suave); }
  .relato { margin:12px 20px 0; white-space:pre-wrap; }
  ol.paradas { list-style:none; margin:14px 0 0; padding:0 20px 20px; }
  ol.paradas li { padding:10px 0; border-top:1px solid var(--borde); }
  ol.paradas li:first-child { border-top:0; }
  ol.paradas h3 { margin:0; font-size:16px; font-weight:600; }
  li.visitada h3::after { content:" ✓"; color:#16a34a; }
  .nota { margin:4px 0 0; font-size:14px; color:var(--suave); white-space:pre-wrap; }
  .estrellas { color:#f97316; letter-spacing:1px; }
  .galeria { display:grid; grid-template-columns:repeat(2,1fr); gap:3px; }
  .galeria img { width:100%; height:190px; object-fit:cover; display:block; }
  footer { padding:24px 20px; text-align:center; font-size:13px; color:var(--suave); }
</style></head>
<body><div class="hoja">
<header class="viaje">
  <h1>${esc(trip.name)}</h1>
  <p class="meta">${esc(formatDateLong(trip.startDate))} — ${esc(formatDateLong(trip.endDate))}</p>
  <p class="meta">${visitadas} ${visitadas === 1 ? "parada visitada" : "paradas visitadas"}${totalGasto > 0 ? ` · ${esc(formatEUR(totalGasto))}` : ""}</p>
</header>
${dias}
<footer>Álbum generado desde Easy Travel. Este archivo se abre solo, sin conexión ni programas.</footer>
</div></body></html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    triggerDownload(blob, `${nombreArchivo(trip.name, "viaje")}-album.html`);

    return { fotos: usadas, bytes: blob.size, sinIncrustar };
  },
};

async function fotosDelViaje(trip: Trip): Promise<StoredPhoto[]> {
  const ids = new Set(trip.days.map((d) => d.id));
  const todas = await db.photos.toArray();
  // Sólo fotos tuyas y de un día del viaje: los tickets de gastos van sin día
  // justamente para no acabar en el álbum.
  return todas.filter((f) => f.dayId && ids.has(f.dayId));
}
