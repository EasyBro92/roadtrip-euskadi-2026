import { Heart, Navigation, Plus, Receipt, Share2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { CategoryThumb } from "../../components/CategoryThumb";
import { useLocationStore } from "../../stores/useLocationStore";
import { useLugarStore, type LugarElegido } from "../../stores/useLugarStore";
import { useSavedPlacesStore } from "../../stores/useSavedPlacesStore";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import { fechaLocal, formatEUR, formatKm } from "../../utils/format";
import type { ExpenseCategory, StopCategory } from "../../types";
import { haversineDistanceMeters } from "../../utils/geo";
import { openExternalUrl } from "../../utils/openExternal";

function urlComoLlegar(lugar: LugarElegido): string {
  const { latitude, longitude } = lugar.coordinates;
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

/** Con qué categoría de gasto se apunta lo pagado en cada tipo de sitio. */
const GASTO_DE: Partial<Record<StopCategory, ExpenseCategory>> = {
  gastronomia: "restaurante",
  hotel: "hotel",
  aparcamiento: "aparcamiento",
  cultura: "entrada",
  castillo: "entrada",
  historia: "entrada",
  estadio: "entrada",
};

function mismoSitio(a: { nombre: string; coordinates: LugarElegido["coordinates"] }, b: LugarElegido): boolean {
  return (
    a.nombre.trim().toLowerCase() === b.nombre.trim().toLowerCase() &&
    a.coordinates.latitude.toFixed(4) === b.coordinates.latitude.toFixed(4) &&
    a.coordinates.longitude.toFixed(4) === b.coordinates.longitude.toFixed(4)
  );
}

/**
 * La ficha de un sitio sobre el mapa, al estilo de Booking y Google Maps.
 *
 * Foto arriba, nombre, qué es y a cuánto está, chips con lo que se sepa
 * (cocina, precio), una fila de botones redondos y un botón grande abajo con
 * lo que casi siempre quieres hacer: añadirlo al viaje. Sirve igual para un
 * resultado del buscador, un restaurante de "qué hay cerca", un sitio de
 * interés o un punto que hayas marcado manteniendo pulsado el mapa.
 */
export function FichaLugar() {
  const lugar = useLugarStore((s) => s.lugar);
  const elegir = useLugarStore((s) => s.elegir);
  const lugares = useSavedPlacesStore((s) => s.lugares);
  const guardar = useSavedPlacesStore((s) => s.guardar);
  const quitar = useSavedPlacesStore((s) => s.quitar);
  const openModal = useUIStore((s) => s.openModal);
  const pushToast = useUIStore((s) => s.pushToast);
  const addStop = useTripStore((s) => s.addStop);
  const viajeActivo = useTripStore((s) => s.trip.name);
  const travelers = useTripStore((s) => s.trip.travelers);
  const currentDayId = useTripStore((s) => s.trip.currentDayId);
  const addExpense = useTripStore((s) => s.addExpense);
  const miPosicion = useLocationStore((s) => s.position);
  // Para que el corazón lata sólo al guardar, no cada vez que se abre la ficha.
  const [latido, setLatido] = useState(0);

  // Escape cierra, como cualquier otra hoja de la app.
  useEffect(() => {
    if (!lugar) return;
    const alPulsar = (e: KeyboardEvent) => e.key === "Escape" && elegir(null);
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [lugar, elegir]);

  if (!lugar) return null;

  const guardado = lugares.find((p) => mismoSitio(p, lugar));
  const distancia = miPosicion ? haversineDistanceMeters(miPosicion, lugar.coordinates) : null;

  function anadir() {
    if (!lugar) return;
    openModal({
      type: "day-picker",
      title: `Añadir ${lugar.nombre}`,
      message: `Se añadirá a "${viajeActivo}". ¿A qué día?`,
      onPick: (dayId) => {
        addStop(dayId, { name: lugar.nombre, category: lugar.categoria, coordinates: lugar.coordinates });
        pushToast(`${lugar.nombre} añadido a tu itinerario.`, "success");
        elegir(null);
      },
    });
  }

  function alternarGuardado() {
    if (!lugar) return;
    if (guardado) {
      quitar(guardado.id);
      pushToast(`${lugar.nombre} ya no está en "Quiero ir".`, "info");
      return;
    }
    guardar({ nombre: lugar.nombre, coordinates: lugar.coordinates, categoria: lugar.categoria });
    setLatido((n) => n + 1);
    pushToast(`${lugar.nombre} guardado en "Quiero ir".`, "success");
  }

  /*
   * Apuntar lo que has pagado aquí sin salir del mapa. Lo paga el primer
   * viajero y se reparte entre todos, como en el formulario rápido de Gastos;
   * se puede cambiar después desde allí.
   */
  function apuntarGasto() {
    if (!lugar) return;
    const sitio = lugar;
    openModal({
      type: "prompt",
      title: `Gasto en ${sitio.nombre}`,
      message: "¿Cuánto has pagado? Lo pagas tú y se reparte entre todos; puedes cambiarlo en Gastos.",
      placeholder: "0,00",
      onSubmit: (valor) => {
        const importe = Number(valor.replace(",", "."));
        if (!importe || importe <= 0) {
          pushToast("Escribe un importe mayor que cero.", "error");
          return;
        }
        const ahora = new Date();
        addExpense({
          date: fechaLocal(ahora),
          time: ahora.toTimeString().slice(0, 5),
          amountEUR: importe,
          category: GASTO_DE[sitio.categoria] ?? "otros",
          place: sitio.nombre,
          dayId: currentDayId ?? null,
          stopId: null,
          paidByTravelerId: travelers[0]?.id ?? null,
          splitBetweenTravelerIds: travelers.map((t) => t.id),
          paymentMethod: "tarjeta",
          notes: "",
          receiptPhotoId: null,
          kind: "actual",
        });
        pushToast(`${formatEUR(importe)} apuntados en ${sitio.nombre}.`, "success");
      },
    });
  }

  async function compartir() {
    if (!lugar) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${lugar.coordinates.latitude},${lugar.coordinates.longitude}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: lugar.nombre, text: lugar.nombre, url });
        return;
      }
      await navigator.clipboard.writeText(`${lugar.nombre} ${url}`);
      pushToast("Enlace copiado.", "success");
    } catch {
      // Cerrar el diálogo de compartir no es un error que haya que contar.
    }
  }

  return (
    <div
      role="dialog"
      aria-label={lugar.nombre}
      // `key` hace que la animación de entrada se repita al cambiar de sitio.
      key={lugar.id}
      className="sube-desde-abajo pointer-events-auto absolute inset-x-3 bottom-3 z-[620] overflow-hidden rounded-3xl border bg-(--color-surface) shadow-(--shadow-sheet) sm:inset-x-auto sm:left-3 sm:w-96"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div className="relative">
        <CategoryThumb
          category={lugar.categoria}
          lugar={{ nombre: lugar.nombre, coordinates: lugar.coordinates }}
          className="h-28 w-full"
          iconSize={40}
        />
        <button
          aria-label="Cerrar ficha"
          onClick={() => elegir(null)}
          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="px-4 pb-4 pt-3">
        <h2 className="truncate text-lg font-semibold text-(--color-text)">{lugar.nombre}</h2>
        <p className="truncate text-sm text-(--color-text-muted)">
          {lugar.tipo}
          {distancia != null && <> · a {formatKm(distancia)}</>}
        </p>

        {lugar.chips && lugar.chips.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {lugar.chips.map((chip) => (
              <span key={chip} className="rounded-full bg-(--color-surface-muted) px-2.5 py-0.5 text-xs text-(--color-text)">
                {chip}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex justify-around">
          <BotonRedondo icono={Navigation} etiqueta="Cómo llegar" onClick={() => openExternalUrl(urlComoLlegar(lugar))} relleno />
          <BotonRedondo
            key={latido}
            icono={Heart}
            etiqueta={guardado ? "Guardado" : "Guardar"}
            activo={Boolean(guardado)}
            animar={latido > 0}
            onClick={alternarGuardado}
          />
          <BotonRedondo icono={Receipt} etiqueta="Gasto" onClick={apuntarGasto} />
          <BotonRedondo icono={Share2} etiqueta="Compartir" onClick={() => void compartir()} />
        </div>

        <button
          onClick={anadir}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-(--color-navigation) text-sm font-semibold text-white shadow-(--shadow-card)"
        >
          <Plus size={18} aria-hidden="true" /> Añadir al viaje
        </button>
      </div>
    </div>
  );
}

function BotonRedondo({
  icono: Icono,
  etiqueta,
  onClick,
  activo,
  relleno,
  animar,
}: {
  icono: typeof Heart;
  etiqueta: string;
  onClick: () => void;
  activo?: boolean;
  relleno?: boolean;
  animar?: boolean;
}) {
  const lleno = relleno || activo;
  return (
    <button onClick={onClick} className="flex w-16 flex-col items-center gap-1">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full border ${animar ? "latido" : ""}`}
        style={{
          borderColor: lleno ? "var(--color-navigation)" : "var(--color-border)",
          background: lleno ? "var(--color-navigation)" : "transparent",
        }}
      >
        <Icono size={18} color={lleno ? "#fff" : "var(--color-link)"} fill={activo ? "#fff" : "none"} aria-hidden="true" />
      </span>
      <span className="text-xs font-medium text-(--color-link)">{etiqueta}</span>
    </button>
  );
}
