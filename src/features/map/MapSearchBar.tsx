import type L from "leaflet";
import { ArrowLeft, Bookmark, Clock, MapPin, Search, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { etiquetaParada } from "../itinerary/etiquetaParada";
import { useBusquedaDeLugares } from "../../hooks/useBusquedaDeLugares";
import type { GeocodingResult } from "../../services/geocoding/GeocodingService";
import { recuadroDe } from "../../services/geocoding/zonaDelViaje";
import { NEARBY_CATEGORY_LABEL } from "../../services/places/NearbyService";
import { StorageService } from "../../services/storage/StorageService";
import { useLugarStore, type LugarElegido } from "../../stores/useLugarStore";
import { useSavedPlacesStore, type LugarGuardado } from "../../stores/useSavedPlacesStore";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import type { Stop } from "../../types";
import { buscarCategoriaEnMapa } from "./buscarEnMapa";
import { categoriaDeTipoOsm, categoriaEscrita, partirDireccion } from "./categoriaDeLugar";

const CLAVE_RECIENTES = "busquedas-recientes";
const MAX_RECIENTES = 6;

function leerRecientes(): LugarElegido[] {
  return StorageService.get<LugarElegido[]>(CLAVE_RECIENTES, []);
}

function sinTildes(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * El buscador del mapa, al estilo de Google Maps.
 *
 * Busca a la vez en cuatro sitios y lo enseña por grupos: una categoría si lo
 * escrito lo es ("gasolinera"), tus paradas, tus sitios guardados y cualquier
 * lugar del mundo. Tocar un lugar ya no lo mete en el viaje sin preguntar:
 * abre su ficha en el mapa, y desde ahí decides si añadirlo, guardarlo o ir.
 * Con la caja vacía enseña lo último que buscaste.
 */
export function MapSearchBar({ map }: { dayId: string; map: L.Map }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [recientes, setRecientes] = useState<LugarElegido[]>(leerRecientes);
  const input = useRef<HTMLInputElement>(null);

  const allStops = useTripStore((s) => s.stopsById);
  const setCurrentStop = useTripStore((s) => s.setCurrentStop);
  const setCurrentDay = useTripStore((s) => s.setCurrentDay);
  const guardados = useSavedPlacesStore((s) => s.lugares);
  const setBottomSheetState = useUIStore((s) => s.setBottomSheetState);
  const elegirLugar = useLugarStore((s) => s.elegir);

  const texto = query.trim();
  const categoria = categoriaEscrita(texto);

  const localMatches = useMemo(() => {
    const q = sinTildes(texto);
    if (q.length < 2) return [];
    return Object.values(allStops)
      .filter((s) => sinTildes(s.name).includes(q) || s.category.includes(q))
      .slice(0, 5);
  }, [texto, allStops]);

  const guardadosQueCoinciden = useMemo(() => {
    const q = sinTildes(texto);
    if (q.length < 2) return [];
    return guardados.filter((l) => sinTildes(l.nombre).includes(q)).slice(0, 3);
  }, [texto, guardados]);

  const zona = useMemo(() => recuadroDe(Object.values(allStops).map((s) => s.coordinates)), [allStops]);
  // Escrita una categoría, no se pregunta a Nominatim por un sitio llamado "gasolinera".
  const { resultados: remoteResults, buscando: searching } = useBusquedaDeLugares(categoria ? "" : query, { limite: 5, cerca: zona });

  function recordar(lugar: LugarElegido) {
    const siguientes = [lugar, ...recientes.filter((r) => r.id !== lugar.id)].slice(0, MAX_RECIENTES);
    setRecientes(siguientes);
    StorageService.set(CLAVE_RECIENTES, siguientes);
  }

  function abrirLugar(lugar: LugarElegido) {
    recordar(lugar);
    elegirLugar(lugar);
    close();
  }

  function goToStop(stop: Stop) {
    elegirLugar(null);
    setCurrentDay(stop.dayId);
    setCurrentStop(stop.id);
    map.flyTo([stop.coordinates.latitude, stop.coordinates.longitude], 14, { duration: 0.8 });
    setBottomSheetState("mid");
    close();
  }

  function lugarDeResultado(result: GeocodingResult): LugarElegido {
    const { nombre, resto } = partirDireccion(result.displayName);
    return {
      id: `busqueda:${result.coordinates.latitude.toFixed(5)},${result.coordinates.longitude.toFixed(5)}`,
      nombre,
      tipo: resto,
      categoria: categoriaDeTipoOsm(result.type),
      coordinates: result.coordinates,
      origen: "busqueda",
    };
  }

  function lugarDeGuardado(l: LugarGuardado): LugarElegido {
    return { id: `guardado:${l.id}`, nombre: l.nombre, tipo: "En tus guardados", categoria: l.categoria ?? "cultura", coordinates: l.coordinates, origen: "busqueda" };
  }

  function buscarCategoria() {
    if (!categoria) return;
    buscarCategoriaEnMapa(map, categoria);
    close();
  }

  /** Intro elige lo primero de la lista, como en cualquier buscador. */
  function alPulsarIntro() {
    if (categoria) return buscarCategoria();
    if (localMatches[0]) return goToStop(localMatches[0]);
    if (guardadosQueCoinciden[0]) return abrirLugar(lugarDeGuardado(guardadosQueCoinciden[0]));
    if (remoteResults[0]) return abrirLugar(lugarDeResultado(remoteResults[0]));
  }

  function close() {
    // Vaciar la consulta ya vacía los resultados: el hook los limpia solo en
    // cuanto baja del mínimo de letras.
    setQuery("");
    setFocused(false);
    input.current?.blur();
  }

  const escribiendo = texto.length >= 2;
  const sinNada = !searching && !categoria && localMatches.length === 0 && guardadosQueCoinciden.length === 0 && remoteResults.length === 0;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[570] px-3 pt-3">
      <div className="pointer-events-auto">
        <div
          className={`flex h-12 items-center gap-2 rounded-full border bg-(--color-surface) px-2 shadow-(--shadow-card) transition-shadow duration-200 ${focused ? "shadow-(--shadow-sheet)" : ""}`}
          style={{ borderColor: "var(--color-border)" }}
        >
          {focused ? (
            <button onClick={close} aria-label="Cerrar búsqueda" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-(--color-text)">
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center text-(--color-text-muted)">
              <Search size={18} aria-hidden="true" />
            </span>
          )}
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") alPulsarIntro();
              if (e.key === "Escape") close();
            }}
            enterKeyHint="search"
            placeholder="Busca un sitio, una parada o «gasolinera»"
            aria-label="Buscar paradas o lugares"
            className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-(--color-text-muted)"
            // El foco ya se ve en la píldora entera (sombra y flecha de volver):
            // el recuadro global de foco dentro de ella parecía un error.
            style={{ outline: "none" }}
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Limpiar búsqueda" className="flex h-9 w-9 shrink-0 items-center justify-center text-(--color-text-muted)">
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>

        {focused && (
          <div
            className="aparece mt-2 max-h-[60vh] overflow-y-auto rounded-2xl border bg-(--color-surface) py-1 shadow-(--shadow-sheet)"
            style={{ borderColor: "var(--color-border)" }}
            // Que tocar un resultado no quite antes el foco y cierre la lista.
            onPointerDown={(e) => e.preventDefault()}
          >
            {!escribiendo &&
              (recientes.length > 0 ? (
                <>
                  <Grupo titulo="Recientes" />
                  {recientes.map((r) => (
                    <Fila key={r.id} icono={<Clock size={17} className="text-(--color-text-muted)" />} titulo={r.nombre} subtitulo={r.tipo} onClick={() => abrirLugar(r)} />
                  ))}
                  <button
                    onClick={() => {
                      setRecientes([]);
                      StorageService.set(CLAVE_RECIENTES, []);
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-medium text-(--color-link)"
                  >
                    Borrar historial
                  </button>
                </>
              ) : (
                <p className="px-4 py-4 text-sm text-(--color-text-muted)">
                  Escribe un pueblo, una de tus paradas o algo como «gasolinera» o «comer». También puedes mantener pulsado el mapa para marcar un punto.
                </p>
              ))}

            {escribiendo && categoria && (
              <Fila
                icono={<Search size={17} className="text-(--color-link)" />}
                titulo={`${NEARBY_CATEGORY_LABEL[categoria]} en esta zona`}
                subtitulo="Alrededor de donde estás mirando el mapa"
                onClick={buscarCategoria}
              />
            )}

            {escribiendo && localMatches.length > 0 && (
              <>
                <Grupo titulo="En tu viaje" />
                {localMatches.map((stop) => (
                  <Fila
                    key={stop.id}
                    icono={<MapPin size={17} className="text-(--color-link)" />}
                    titulo={stop.name}
                    subtitulo={etiquetaParada(stop.category)}
                    onClick={() => goToStop(stop)}
                  />
                ))}
              </>
            )}

            {escribiendo && guardadosQueCoinciden.length > 0 && (
              <>
                <Grupo titulo="Guardados" />
                {guardadosQueCoinciden.map((l) => (
                  <Fila
                    key={l.id}
                    icono={<Bookmark size={17} className="text-(--color-hotel)" />}
                    titulo={l.nombre}
                    subtitulo="Quiero ir"
                    onClick={() => abrirLugar(lugarDeGuardado(l))}
                  />
                ))}
              </>
            )}

            {escribiendo && remoteResults.length > 0 && (
              <>
                <Grupo titulo="Lugares" />
                {remoteResults.map((result, i) => {
                  const { nombre, resto } = partirDireccion(result.displayName);
                  return (
                    <Fila
                      key={i}
                      icono={<MapPin size={17} className="text-(--color-text-muted)" />}
                      titulo={nombre}
                      subtitulo={resto}
                      onClick={() => abrirLugar(lugarDeResultado(result))}
                    />
                  );
                })}
              </>
            )}

            {escribiendo && searching && remoteResults.length === 0 && (
              <div aria-label="Buscando" role="status">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="esqueleto h-5 w-5 rounded-full" />
                    <span className="flex-1 space-y-1.5">
                      <span className="esqueleto block h-3 w-2/3 rounded" />
                      <span className="esqueleto block h-2.5 w-1/2 rounded" />
                    </span>
                  </div>
                ))}
              </div>
            )}

            {escribiendo && sinNada && <p className="px-4 py-4 text-center text-sm text-(--color-text-muted)">Sin resultados para "{texto}".</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function Grupo({ titulo }: { titulo: string }) {
  return <p className="px-4 pb-1 pt-2.5 text-xs font-medium uppercase tracking-wide text-(--color-text-muted)">{titulo}</p>;
}

function Fila({ icono, titulo, subtitulo, onClick }: { icono: React.ReactNode; titulo: string; subtitulo?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-(--color-surface-muted)">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--color-surface-muted)" aria-hidden="true">
        {icono}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-(--color-text)">{titulo}</span>
        {subtitulo && <span className="block truncate text-xs text-(--color-text-muted)">{subtitulo}</span>}
      </span>
    </button>
  );
}
