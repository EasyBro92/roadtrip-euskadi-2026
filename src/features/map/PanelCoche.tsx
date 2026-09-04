import type L from "leaflet";
import { Car, Footprints, MapPin, RefreshCw, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useCocheStore } from "../../stores/useCocheStore";
import { useLocationStore } from "../../stores/useLocationStore";
import { useUIStore } from "../../stores/useUIStore";
import { formatKm } from "../../utils/format";
import { haversineDistanceMeters } from "../../utils/geo";

/** "hace 20 min", "hace 3 h". Sirve para saber si el punto es de este rato. */
function hace(iso: string): string {
  const minutos = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutos < 1) return "ahora mismo";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? "ayer" : `hace ${dias} días`;
}

/**
 * Dónde está el coche y cómo volver a él.
 *
 * La distancia es en línea recta, y se dice: en un parking de tres plantas o
 * en un casco viejo, andando siempre es más. Prometer "180 m" cuando son
 * cuatro calles con cuestas sería peor que no decir nada.
 */
export function PanelCoche({ map, onCerrar, onActualizar }: { map: L.Map; onCerrar: () => void; onActualizar: () => Promise<void> }) {
  const coche = useCocheStore((s) => s.coche);
  const ponerNota = useCocheStore((s) => s.ponerNota);
  const olvidar = useCocheStore((s) => s.olvidar);
  const posicion = useLocationStore((s) => s.position);
  const openModal = useUIStore((s) => s.openModal);
  const pushToast = useUIStore((s) => s.pushToast);

  const [nota, setNota] = useState(coche?.nota ?? "");
  const [actualizando, setActualizando] = useState(false);

  if (!coche) return null;

  async function actualizar() {
    setActualizando(true);
    await onActualizar();
    setActualizando(false);
  }

  const { latitude, longitude } = coche.coordinates;
  const distancia = posicion ? haversineDistanceMeters(posicion, coche.coordinates) : null;

  return (
    <div
      className="pointer-events-auto absolute inset-x-3 bottom-3 flex flex-col overflow-hidden rounded-2xl border bg-(--color-surface) shadow-(--shadow-card) sm:inset-x-auto sm:right-16 sm:w-80"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2" style={{ borderColor: "var(--color-border)" }}>
        <p className="flex items-center gap-1.5 text-sm font-medium text-(--color-text)">
          <Car size={15} aria-hidden="true" /> Tu coche
        </p>
        <button aria-label="Cerrar" onClick={onCerrar} className="-mr-1 p-1 text-(--color-text-muted)">
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="p-3">
        <p className="text-sm text-(--color-text)">
          {distancia !== null ? (
            <>
              A <strong>{formatKm(distancia)}</strong> en línea recta
            </>
          ) : (
            "Aparcado aquí"
          )}
          <span className="text-(--color-text-muted)"> · {hace(coche.guardadoEn)}</span>
        </p>

        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          onBlur={() => ponerNota(nota)}
          placeholder="Planta, plaza, calle… (opcional)"
          aria-label="Nota de dónde está el coche"
          className="mt-2.5 w-full rounded-(--radius-control) border bg-(--color-bg) px-3 py-2 text-sm text-(--color-text)"
          style={{ borderColor: "var(--color-border)" }}
        />

        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              map.flyTo([latitude, longitude], 18);
              onCerrar();
            }}
            className="flex items-center justify-center gap-1.5 rounded-full border py-2 text-xs font-medium text-(--color-text)"
            style={{ borderColor: "var(--color-border)" }}
          >
            <MapPin size={13} aria-hidden="true" /> Verlo en el mapa
          </button>

          {/* Andando, no en coche: el coche es el destino. */}
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=walking`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-full bg-(--color-navigation) py-2 text-xs font-semibold text-white"
          >
            <Footprints size={13} aria-hidden="true" /> Llévame
          </a>
        </div>

        {/*
         * Volver a marcarlo aquí, para cuando has movido el coche a otro
         * sitio. Antes la única forma era "Ya lo he cogido" y luego apuntarlo
         * de nuevo desde el botón del mapa — dos pasos para lo que es una
         * sola cosa: "ahora está aquí".
         */}
        <button
          onClick={actualizar}
          disabled={actualizando}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full border py-2 text-xs font-medium text-(--color-text) disabled:opacity-50"
          style={{ borderColor: "var(--color-border)" }}
        >
          <RefreshCw size={13} className={actualizando ? "animate-spin" : undefined} aria-hidden="true" />
          {actualizando ? "Buscando tu posición…" : "He movido el coche: marcarlo aquí"}
        </button>

        <button
          onClick={() =>
            openModal({
              type: "confirm",
              title: "Ya lo he cogido",
              message: "¿Quitar el coche del mapa? Volverás a guardarlo la próxima vez que aparques.",
              onConfirm: () => {
                olvidar();
                onCerrar();
                pushToast("Buen viaje.", "success");
              },
            })
          }
          className="mt-3 flex w-full items-center justify-center gap-1.5 border-t py-2.5 text-xs text-(--color-text-muted)"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Trash2 size={12} aria-hidden="true" /> Ya lo he cogido: quitar del mapa
        </button>
      </div>
    </div>
  );
}
