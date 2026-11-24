import { useLiveQuery } from "dexie-react-hooks";
import L from "leaflet";
import { useMemo } from "react";
import { Marker } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { db } from "../../services/storage/db";
import { useLugarStore } from "../../stores/useLugarStore";
import { useSavedPlacesStore } from "../../stores/useSavedPlacesStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { useTripStore } from "../../stores/useTripStore";
import { CAPAS_POR_DEFECTO, type ID } from "../../types";

function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Miniatura redonda de la última foto hecha en una parada, con cuántas hay. */
function iconoFoto(miniatura: string, cuantas: number): L.DivIcon {
  // La miniatura es un data: URL que genera la propia app; aun así no se mete
  // nada que no lo sea dentro del HTML del marcador.
  const src = miniatura.startsWith("data:image/") ? miniatura : "";
  return L.divIcon({
    className: "",
    html: `<div class="pin-cae" style="position:relative;width:40px;height:40px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);background:#ddd url('${src}') center/cover;">
      ${cuantas > 1 ? `<span style="position:absolute;right:-6px;top:-6px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:#006ce4;color:#fff;font:600 11px/18px sans-serif;text-align:center;">${cuantas}</span>` : ""}
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 46],
  });
}

/** Etiqueta con lo gastado en una parada, como el precio de un hotel en el mapa de Booking. */
function iconoGasto(importe: number): L.DivIcon {
  const texto = `${Math.round(importe).toLocaleString("es-ES")} €`;
  return L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,0);display:inline-block;"><div class="pin-cae" style="white-space:nowrap;padding:3px 8px;border-radius:12px;background:var(--color-surface);color:var(--color-text);border:1px solid var(--color-border);box-shadow:0 1px 4px rgba(0,0,0,.25);font:600 12px/1.3 var(--font-sans);">${escapar(texto)}</div></div>`,
    iconSize: [0, 0],
    iconAnchor: [0, -6],
  });
}

const ICONO_GUARDADO = L.divIcon({
  className: "",
  html: `<div class="pin-cae" style="width:24px;height:24px;border-radius:50%;background:#ec4899;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

/**
 * Lo tuyo sobre el mapa, además de las paradas: dónde hiciste fotos, cuánto
 * gastaste en cada sitio y los sitios que tienes guardados para ir.
 *
 * Antes cada cosa vivía en su pantalla y el mapa sólo sabía de la ruta. Se
 * encienden y apagan desde el panel de capas.
 */
export function CapasExtra() {
  const capas = useSettingsStore((s) => s.settings.capasMapa ?? CAPAS_POR_DEFECTO);
  const stopsById = useTripStore((s) => s.stopsById);
  const expenses = useTripStore((s) => s.expenses);
  const lugares = useSavedPlacesStore((s) => s.lugares);
  const elegirLugar = useLugarStore((s) => s.elegir);
  const navigate = useNavigate();

  // Sólo lo ligero: id, parada y miniatura. El blob de la foto no hace falta aquí.
  const fotos = useLiveQuery(
    async () =>
      capas.fotos
        ? (await db.photos.where("stopId").notEqual("").toArray()).map((f) => ({ stopId: f.stopId, miniatura: f.thumbnailDataUrl, takenAt: f.takenAt }))
        : [],
    [capas.fotos],
  );

  const fotosPorParada = useMemo(() => {
    const mapa = new Map<ID, { miniatura: string; cuantas: number; takenAt: string }>();
    for (const f of fotos ?? []) {
      if (!f.stopId || !stopsById[f.stopId]) continue;
      const previa = mapa.get(f.stopId);
      if (!previa) mapa.set(f.stopId, { miniatura: f.miniatura, cuantas: 1, takenAt: f.takenAt });
      else mapa.set(f.stopId, { miniatura: f.takenAt > previa.takenAt ? f.miniatura : previa.miniatura, cuantas: previa.cuantas + 1, takenAt: f.takenAt > previa.takenAt ? f.takenAt : previa.takenAt });
    }
    return [...mapa.entries()];
  }, [fotos, stopsById]);

  const gastosPorParada = useMemo(() => {
    if (!capas.gastos) return [];
    const mapa = new Map<ID, number>();
    for (const e of expenses) if (e.stopId && stopsById[e.stopId]) mapa.set(e.stopId, (mapa.get(e.stopId) ?? 0) + e.amountEUR);
    return [...mapa.entries()].filter(([, total]) => total > 0);
  }, [capas.gastos, expenses, stopsById]);

  return (
    <>
      {capas.fotos &&
        fotosPorParada.map(([stopId, f]) => {
          const parada = stopsById[stopId];
          return (
            <Marker
              key={`foto-${stopId}`}
              position={[parada.coordinates.latitude, parada.coordinates.longitude]}
              icon={iconoFoto(f.miniatura, f.cuantas)}
              alt={`Fotos de ${parada.name}`}
              zIndexOffset={200}
              eventHandlers={{ click: () => navigate("/mas/album") }}
            />
          );
        })}

      {gastosPorParada.map(([stopId, total]) => {
        const parada = stopsById[stopId];
        return (
          <Marker
            key={`gasto-${stopId}`}
            position={[parada.coordinates.latitude, parada.coordinates.longitude]}
            icon={iconoGasto(total)}
            alt={`Gastado en ${parada.name}`}
            zIndexOffset={300}
            eventHandlers={{ click: () => navigate("/gastos") }}
          />
        );
      })}

      {capas.guardados &&
        lugares.map((l) => (
          <Marker
            key={`guardado-${l.id}`}
            position={[l.coordinates.latitude, l.coordinates.longitude]}
            icon={ICONO_GUARDADO}
            alt={l.nombre}
            title={l.nombre}
            eventHandlers={{
              click: () =>
                elegirLugar({ id: `guardado:${l.id}`, nombre: l.nombre, tipo: "En tus guardados", categoria: l.categoria ?? "cultura", coordinates: l.coordinates, origen: "interes" }),
            }}
          />
        ))}
    </>
  );
}
