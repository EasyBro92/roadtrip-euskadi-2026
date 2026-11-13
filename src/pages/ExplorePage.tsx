import {
  ArrowLeft,
  Castle,
  Landmark,
  MapPin,
  Mountain,
  Navigation,
  Plus,
  Route,
  Search,
  Trees,
  Umbrella,
  UtensilsCrossed,
  Wine,
  Home,
  X,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Vacio } from "../components/Vacio";
import {
  ETIQUETA_TEMA,
  ETIQUETA_TIPO,
  FILTROS_VACIOS,
  filtrarRutas,
  kmDeRuta,
  kmHastaRuta,
  paisesDe,
  type FiltrosExplorar,
} from "../features/explore/filtrarRutas";
import { useLocationStore } from "../stores/useLocationStore";
import { TODAS_LAS_RUTAS } from "../data/routeTemplates.data";
import { StarRatingInput } from "../components/StarRatingInput";
import { BotonResena } from "../features/reviews/BotonResena";
import { useTripStore } from "../stores/useTripStore";
import { useUIStore } from "../stores/useUIStore";
import type { Coordinates, RouteTag, RouteTemplate, RouteTemplateStop, RouteTipo } from "../types";

const ICONO_TEMA: Record<RouteTag, LucideIcon> = {
  costa: Umbrella,
  montaña: Mountain,
  pueblos: Home,
  naturaleza: Trees,
  cultura: Landmark,
  gastronomia: UtensilsCrossed,
  vino: Wine,
  castillos: Castle,
};

/** Un color por tipo de ruta, para distinguirlas de un vistazo en la lista. */
const PORTADA_TIPO: Record<RouteTipo, string> = {
  roadtrip: "linear-gradient(135deg,#1a73e8,#0d9488)",
  escapada: "linear-gradient(135deg,#f97316,#db2777)",
  ciudad: "linear-gradient(135deg,#7c3aed,#4338ca)",
};
import { toISODate } from "../utils/dates";
import { useEnPantalla } from "../hooks/useEnPantalla";
import { useFotoAutomatica } from "../hooks/useFotoAutomatica";
import type { StopCategory } from "../types";

/** Las categorías que dan una buena portada, por delante de una ciudad o un museo. */
const PARA_PORTADA: StopCategory[] = ["pueblo", "paisaje", "playa", "castillo", "naturaleza", "mirador"];

/** Ficha desplegable de una ruta: sus paradas día a día y el botón de copiar. */
function FichaRuta({ ruta, distanciaKm }: { ruta: RouteTemplate; distanciaKm: number | null }) {
  const createTripFromTemplate = useTripStore((s) => s.createTripFromTemplate);
  const addStop = useTripStore((s) => s.addStop);
  const viajeActivo = useTripStore((s) => s.trip.name);
  const openModal = useUIStore((s) => s.openModal);
  const pushToast = useUIStore((s) => s.pushToast);
  const navigate = useNavigate();

  const [abierta, setAbierta] = useState(false);
  const [startDate, setStartDate] = useState(toISODate(new Date()));

  const dias = Array.from({ length: ruta.dayCount }, (_, i) => i + 1);

  /**
   * Añade una parada suelta al viaje que tengas abierto, sin copiar la ruta
   * entera. El día lo eliges tú: la ruta del catálogo y tu viaje casi nunca
   * tienen los mismos días.
   */
  function anadirSuelta(parada: RouteTemplateStop) {
    openModal({
      type: "day-picker",
      title: `Añadir ${parada.name}`,
      message: `Se añadirá a "${viajeActivo}". ¿A qué día?`,
      onPick: (dayId) => {
        addStop(dayId, {
          name: parada.name,
          category: parada.category,
          coordinates: parada.coordinates,
          shortDescription: parada.shortDescription,
          recommendedDurationMinutes: parada.recommendedDurationMinutes,
        });
        pushToast(`${parada.name} añadida a tu itinerario.`, "success");
      },
    });
  }

  function copiar() {
    createTripFromTemplate(ruta, startDate);
    pushToast(`"${ruta.name}" copiada a tus viajes. Edítala a tu gusto.`, "success");
    navigate("/viaje");
  }

  /*
   * La portada, con foto de verdad.
   *
   * Para una ciudad, la de la propia ciudad. Para un road trip, la de su
   * primera parada con paisaje —un pueblo, una playa, un castillo— antes que
   * la de la capital de la que se sale. Sólo se busca cuando la tarjeta
   * asoma por pantalla: son más de cien y pedirlas todas al entrar no tiene
   * sentido. Si no hay foto se queda el color de siempre.
   */
  const [refTarjeta, enPantalla] = useEnPantalla<HTMLLIElement>();
  const paradaPortada = ruta.stops.find((s) => PARA_PORTADA.includes(s.category)) ?? ruta.stops[0];
  const foto = useFotoAutomatica(
    paradaPortada
      ? ruta.tipo === "ciudad"
        ? { nombre: ruta.name.replace(/ en \d+ días?$/, ""), coordinates: paradaPortada.coordinates }
        : { nombre: paradaPortada.name, coordinates: paradaPortada.coordinates, category: paradaPortada.category }
      : undefined,
    enPantalla,
  );
  const [fotoRota, setFotoRota] = useState(false);

  const km = kmDeRuta(ruta);
  const tipo = ruta.tipo ?? "roadtrip";
  const IconoPortada = ICONO_TEMA[ruta.tags?.[0] ?? "naturaleza"] ?? Mountain;

  return (
    <li
      ref={refTarjeta}
      className="overflow-hidden rounded-(--radius-card) border bg-(--color-surface) shadow-(--shadow-card)"
      // Las tarjetas que no están a la vista no se maquetan ni se pintan
      // hasta que se llega a ellas: con más de cien, es lo que hace que la
      // lista abra y se desplace sin tirones.
      style={{ borderColor: "var(--color-border)", contentVisibility: "auto", containIntrinsicSize: "auto 250px" }}
    >
      <button onClick={() => setAbierta((v) => !v)} className="w-full text-left" aria-expanded={abierta}>
        {/* Portada de color con el tema de la ruta: las tarjetas eran solo
            texto y todas parecían la misma. */}
        <div className={`relative flex items-end justify-between overflow-hidden p-3.5 ${foto && !fotoRota ? "h-36" : "h-24"}`} style={{ background: PORTADA_TIPO[tipo] }}>
          <IconoPortada size={64} strokeWidth={1.25} className="absolute -right-2 -top-2 text-white/20" aria-hidden="true" />
          {foto && !fotoRota && (
            <>
              <img src={foto} alt="" loading="lazy" decoding="async" onError={() => setFotoRota(true)} className="absolute inset-0 h-full w-full object-cover" />
              {/* Un velo abajo para que las dos etiquetas se lean sobre cualquier foto. */}
              <span className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" aria-hidden="true" />
            </>
          )}
          <span className="relative rounded-full bg-black/25 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">{ETIQUETA_TIPO[tipo]}</span>
          <span className="relative rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-(--color-text)">
            {ruta.dayCount} {ruta.dayCount === 1 ? "día" : "días"}
          </span>
        </div>

        <div className="p-4 pb-3">
          <p className="text-xs font-medium uppercase tracking-wide text-(--color-link)">
            {ruta.region}
            {ruta.country && ruta.country !== ruta.region ? ` · ${ruta.country}` : ""}
          </p>
          <h2 className="mt-0.5 text-base font-semibold text-(--color-text)">{ruta.name}</h2>
          <p className={`mt-1.5 text-sm leading-relaxed text-(--color-text-muted) ${abierta ? "" : "line-clamp-2"}`}>{ruta.summary}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-(--color-text-muted)">
            <span className="flex items-center gap-1.5">
              <MapPin size={14} aria-hidden="true" /> {ruta.stops.length} paradas
            </span>
            {km > 0 && (
              <span className="flex items-center gap-1.5" title="En línea recta entre paradas; por carretera serán más">
                <Route size={14} aria-hidden="true" /> ~{km.toLocaleString("es-ES")} km
              </span>
            )}
            {distanciaKm != null && (
              <span className="flex items-center gap-1.5 font-medium text-(--color-link)">
                <Navigation size={14} aria-hidden="true" /> a {Math.round(distanciaKm).toLocaleString("es-ES")} km
              </span>
            )}
          </div>
          {ruta.tags && ruta.tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {ruta.tags.map((t) => (
                <span key={t} className="rounded-full bg-(--color-surface-muted) px-2.5 py-0.5 text-xs text-(--color-text-muted)">
                  {ETIQUETA_TEMA[t]}
                </span>
              ))}
            </div>
          )}
        </div>
      </button>

      {abierta && (
        <div className="mx-4 mb-4 border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
          {/* Puntuar y reseñar van dentro del desplegable: en la tarjeta
              cerrada las estrellas se comían un tercio del espacio. */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="shrink-0 whitespace-nowrap text-xs text-(--color-text-muted)">Puntúa esta ruta</span>
            <StarRatingInput tipo="route" targetId={ruta.id} nombre={ruta.name} size={19} etiqueta={false} />
          </div>
          <div className="mb-3">
            <BotonResena tipo="route" targetId={ruta.id} nombre={ruta.name} />
          </div>

          {dias.map((dia) => (
            <div key={dia} className="mb-3">
              <p className="text-xs font-semibold uppercase text-(--color-text-muted)">Día {dia}</p>
              <ul className="mt-1">
                {ruta.stops
                  .filter((s) => s.dayIndex === dia)
                  .map((s) => (
                    <li key={s.name} className="flex items-center justify-between gap-2 py-1.5">
                      <span className="min-w-0 flex-1 text-sm text-(--color-text)">
                        <span className="font-medium">{s.name}</span>
                        <span className="text-(--color-text-muted)"> · {s.recommendedDurationMinutes} min</span>
                        {s.shortDescription && <span className="block text-xs leading-snug text-(--color-text-muted)">{s.shortDescription}</span>}
                      </span>
                      <button
                        onClick={() => anadirSuelta(s)}
                        aria-label={`Añadir ${s.name} a ${viajeActivo}`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-(--color-link)"
                        style={{ borderColor: "var(--color-border)" }}
                      >
                        <Plus size={16} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ))}

          <label className="mt-2 block text-xs text-(--color-text-muted)">
            Primer día del viaje
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-(--radius-control) border bg-(--color-bg) px-3 py-2.5 text-sm text-(--color-text)"
              style={{ borderColor: "var(--color-border)" }}
            />
          </label>

          <button
            onClick={copiar}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-(--color-navigation) py-3 text-sm font-medium text-white transition-transform active:scale-[0.98]"
          >
            <Plus size={17} aria-hidden="true" /> Copiar a mis viajes
          </button>
        </div>
      )}
    </li>
  );
}

/**
 * Catálogo de rutas prehechas. Copiar una crea un viaje propio: la ruta del
 * catálogo queda intacta y la copia se edita como cualquier otro viaje.
 */
export function ExplorePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const requestSinglePosition = useLocationStore((s) => s.requestSinglePosition);
  const pushToast = useUIStore((s) => s.pushToast);
  const [ubicacion, setUbicacion] = useState<Coordinates | null>(null);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);

  // Los filtros viven en la URL: al abrir una ruta y volver, siguen puestos.
  const filtros: FiltrosExplorar = {
    texto: params.get("q") ?? FILTROS_VACIOS.texto,
    tipo: (params.get("tipo") as FiltrosExplorar["tipo"]) ?? FILTROS_VACIOS.tipo,
    duracion: (params.get("dias") as FiltrosExplorar["duracion"]) ?? FILTROS_VACIOS.duracion,
    tema: (params.get("tema") as FiltrosExplorar["tema"]) ?? FILTROS_VACIOS.tema,
    pais: params.get("pais") ?? FILTROS_VACIOS.pais,
    orden: (params.get("orden") as FiltrosExplorar["orden"]) ?? FILTROS_VACIOS.orden,
  };
  const CLAVE: Record<keyof FiltrosExplorar, string> = { texto: "q", tipo: "tipo", duracion: "dias", tema: "tema", pais: "pais", orden: "orden" };

  function cambiar<K extends keyof FiltrosExplorar>(clave: K, valor: FiltrosExplorar[K]) {
    const siguiente = new URLSearchParams(params);
    if (valor === FILTROS_VACIOS[clave]) siguiente.delete(CLAVE[clave]);
    else siguiente.set(CLAVE[clave], String(valor));
    setParams(siguiente, { replace: true });
  }

  async function ordenarPorCercania() {
    if (filtros.orden === "cerca") {
      cambiar("orden", "recomendadas");
      return;
    }
    setBuscandoUbicacion(true);
    const posicion = ubicacion ?? (await requestSinglePosition());
    setBuscandoUbicacion(false);
    if (!posicion) {
      pushToast("No se pudo saber dónde estás. Revisa el permiso de ubicación.", "error");
      return;
    }
    setUbicacion(posicion);
    cambiar("orden", "cerca");
  }

  const paises = useMemo(() => paisesDe(TODAS_LAS_RUTAS), []);
  // Sin memo: son unas ciento cuarenta rutas y filtrarlas cuesta menos que comparar dependencias.
  const rutas = filtrarRutas(TODAS_LAS_RUTAS, filtros, ubicacion);
  const hayFiltros = params.toString() !== "" && !(params.size === 1 && params.has("orden"));
  const cuenta = (tipo: FiltrosExplorar["tipo"]) => (tipo === "todas" ? TODAS_LAS_RUTAS.length : TODAS_LAS_RUTAS.filter((r) => (r.tipo ?? "roadtrip") === tipo).length);

  return (
    <div className="safe-x min-h-dvh bg-(--color-bg) pb-10 pt-[calc(env(safe-area-inset-top)+20px)]">
      <header className="mb-1 flex items-center gap-2">
        <button onClick={() => navigate("/viajes")} aria-label="Volver a mis viajes" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full active:bg-(--color-surface-muted)">
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <h1 className="text-2xl font-semibold text-(--color-text)">Explorar</h1>
      </header>
      <p className="mb-4 text-sm text-(--color-text-muted)">
        {TODAS_LAS_RUTAS.length} rutas ya montadas. Cópialas a tus viajes y cámbialas a tu gusto.
      </p>

      {/* Buscador */}
      <label className="relative mb-3 block">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-(--color-text-muted)" aria-hidden="true" />
        <input
          type="search"
          value={filtros.texto}
          onChange={(e) => cambiar("texto", e.target.value)}
          placeholder="Busca un sitio, región o país"
          aria-label="Buscar rutas"
          className="w-full rounded-full border bg-(--color-surface) py-3 pl-11 pr-4 text-sm text-(--color-text) shadow-(--shadow-card) placeholder:text-(--color-text-muted)"
          style={{ borderColor: "var(--color-border)" }}
        />
      </label>

      {/* Tipo de ruta */}
      <FilaChips etiqueta="Tipo">
        {(["todas", "roadtrip", "escapada", "ciudad"] as const).filter((t) => cuenta(t) > 0).map((t) => (
          <Chip key={t} activo={filtros.tipo === t} onClick={() => cambiar("tipo", t)}>
            {t === "todas" ? "Todas" : t === "roadtrip" ? "Road trips" : t === "escapada" ? "Escapadas" : "Ciudades"} <span className="opacity-70">{cuenta(t)}</span>
          </Chip>
        ))}
      </FilaChips>

      {/* Duración */}
      <FilaChips etiqueta="Duración">
        {(["todas", "1", "2-3", "4-5", "6+"] as const).map((d) => (
          <Chip key={d} activo={filtros.duracion === d} onClick={() => cambiar("duracion", d)}>
            {d === "todas" ? "Cualquiera" : d === "1" ? "1 día" : `${d} días`}
          </Chip>
        ))}
      </FilaChips>

      {/* Tema */}
      <FilaChips etiqueta="Tema">
        <Chip activo={filtros.tema === "todos"} onClick={() => cambiar("tema", "todos")}>
          Todos
        </Chip>
        {(Object.keys(ETIQUETA_TEMA) as RouteTag[]).map((t) => {
          const Icono = ICONO_TEMA[t];
          return (
            <Chip key={t} activo={filtros.tema === t} onClick={() => cambiar("tema", t)}>
              <Icono size={14} aria-hidden="true" /> {ETIQUETA_TEMA[t]}
            </Chip>
          );
        })}
      </FilaChips>

      {/* País y orden */}
      <div className="mb-4 mt-1 flex gap-2">
        <select
          value={filtros.pais}
          onChange={(e) => cambiar("pais", e.target.value)}
          aria-label="País"
          className="min-w-0 flex-1 rounded-full border bg-(--color-surface) px-4 py-2.5 text-sm text-(--color-text)"
          style={{ borderColor: "var(--color-border)" }}
        >
          <option value="todos">Todos los países</option>
          {paises.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={filtros.orden === "cerca" ? "cerca" : filtros.orden}
          onChange={(e) => {
            const valor = e.target.value as FiltrosExplorar["orden"];
            if (valor === "cerca") void ordenarPorCercania();
            else cambiar("orden", valor);
          }}
          aria-label="Ordenar"
          className="min-w-0 flex-1 rounded-full border bg-(--color-surface) px-4 py-2.5 text-sm text-(--color-text)"
          style={{ borderColor: "var(--color-border)" }}
        >
          <option value="recomendadas">Recomendadas</option>
          <option value="cortas">Más cortas</option>
          <option value="largas">Más largas</option>
          <option value="cerca">{buscandoUbicacion ? "Buscando dónde estás…" : "Más cerca de mí"}</option>
        </select>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-(--color-text-muted)">
          {rutas.length === 1 ? "1 ruta" : `${rutas.length} rutas`}
        </p>
        {hayFiltros && (
          <button onClick={() => setParams(new URLSearchParams(), { replace: true })} className="flex items-center gap-1 text-sm font-medium text-(--color-link)">
            <X size={15} aria-hidden="true" /> Quitar filtros
          </button>
        )}
      </div>

      {rutas.length === 0 ? (
        <Vacio
          icon={Search}
          titulo="Ninguna ruta encaja"
          texto="Prueba con menos filtros, o pídele al generador una ruta a medida para ese sitio."
          accion={{ etiqueta: "Crear una a medida", onClick: () => navigate("/crear") }}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {rutas.map((ruta) => (
            <FichaRuta key={ruta.id} ruta={ruta} distanciaKm={filtros.orden === "cerca" && ubicacion ? kmHastaRuta(ruta, ubicacion) : null} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Una fila de chips que se desplaza en horizontal, con su nombre para lectores de pantalla. */
function FilaChips({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={etiqueta} className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {children}
    </div>
  );
}

function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={activo}
      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm transition-colors ${
        activo ? "border-(--color-navigation) bg-(--color-navigation) font-medium text-white" : "bg-(--color-surface) text-(--color-text)"
      }`}
      style={activo ? undefined : { borderColor: "var(--color-border)" }}
    >
      {children}
    </button>
  );
}
