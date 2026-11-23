import type L from "leaflet";
import { Banknote, BedDouble, Fuel, Landmark, Loader2, ParkingCircle, Pill, ShoppingCart, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import type { NearbyCategory } from "../../services/places/NearbyService";
import { useNearbyStore } from "../../stores/useNearbyStore";
import { usePoiStore } from "../../stores/usePoiStore";
import { useUIStore } from "../../stores/useUIStore";
import { buscarCategoriaEnMapa } from "./buscarEnMapa";

const CHIPS: { categoria: NearbyCategory; etiqueta: string; icono: LucideIcon }[] = [
  { categoria: "restaurante", etiqueta: "Restaurantes", icono: UtensilsCrossed },
  { categoria: "gasolinera", etiqueta: "Gasolineras", icono: Fuel },
  { categoria: "aparcamiento", etiqueta: "Aparcar", icono: ParkingCircle },
  { categoria: "hotel", etiqueta: "Hoteles", icono: BedDouble },
  { categoria: "supermercado", etiqueta: "Supermercados", icono: ShoppingCart },
  { categoria: "cajero", etiqueta: "Cajeros", icono: Banknote },
  { categoria: "farmacia", etiqueta: "Farmacias", icono: Pill },
];

/**
 * Fila de chips bajo el buscador, como en Google Maps: un toque y el mapa se
 * llena de restaurantes, gasolineras o aparcamientos de la zona que estás
 * mirando. Otro toque en el mismo chip los quita.
 *
 * Es lo mismo que el panel "Qué hay cerca", sin tener que abrirlo: lo que más
 * se busca viajando, a la vista y a un toque.
 */
export function ChipsCategorias({ map }: { map: L.Map }) {
  const categoria = useNearbyStore((s) => s.categoria);
  const cargando = useNearbyStore((s) => s.cargando);
  const resultados = useNearbyStore((s) => s.resultados);
  const error = useNearbyStore((s) => s.error);
  const limpiar = useNearbyStore((s) => s.limpiar);
  const poisActiva = usePoiStore((s) => s.activa);
  const alternarPois = usePoiStore((s) => s.alternar);
  const pushToast = useUIStore((s) => s.pushToast);
  /*
   * La búsqueda que lanzó un chip y aún no ha contestado. El almacén lo
   * comparte el panel "Qué hay cerca", y sus búsquedas ni encuadran el mapa ni
   * deben avisar dos veces: sólo se reacciona a las que salen de aquí.
   */
  const pendiente = useRef<NearbyCategory | null>(null);

  useEffect(() => {
    if (cargando || !categoria || pendiente.current !== categoria) return;
    pendiente.current = null;
    if (error) {
      pushToast(error, "error");
      return;
    }
    if (resultados.length === 0) {
      pushToast("No hay ninguno en esta zona. Mueve el mapa y prueba otra vez.", "info");
      return;
    }
    // Al llegar los resultados, el mapa se encuadra para verlos todos.
    map.flyToBounds(
      resultados.map((r) => [r.coordinates.latitude, r.coordinates.longitude] as [number, number]),
      { padding: [72, 72], maxZoom: 16, duration: 0.7 },
    );
  }, [cargando, categoria, error, resultados, map, pushToast]);

  function tocar(c: NearbyCategory) {
    if (categoria === c) {
      pendiente.current = null;
      limpiar();
      return;
    }
    pendiente.current = c;
    buscarCategoriaEnMapa(map, c);
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[112px] z-[535]">
      <div className="pointer-events-auto flex gap-2 overflow-x-auto pb-2 pl-3 pr-3 scrollbar-none" role="toolbar" aria-label="Buscar por categoría en esta zona">
        <Chip etiqueta="Qué ver" icono={Landmark} activo={poisActiva} onClick={alternarPois} />
        {CHIPS.map(({ categoria: c, etiqueta, icono }) => (
          <Chip key={c} etiqueta={etiqueta} icono={icono} activo={categoria === c} cargando={cargando && categoria === c} onClick={() => tocar(c)} />
        ))}
      </div>
    </div>
  );
}

function Chip({ etiqueta, icono: Icono, activo, cargando, onClick }: { etiqueta: string; icono: LucideIcon; activo: boolean; cargando?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={activo}
      className={`flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-medium shadow-(--shadow-card) transition-colors duration-200 ${
        activo ? "border-transparent bg-(--color-text) text-(--color-surface)" : "bg-(--color-surface) text-(--color-text)"
      }`}
      style={activo ? undefined : { borderColor: "var(--color-border)" }}
    >
      {cargando ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Icono size={14} aria-hidden="true" />}
      {etiqueta}
    </button>
  );
}
