import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, PenLine, Star } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TODAS_LAS_RUTAS } from "../data/routeTemplates.data";
import { db } from "../services/storage/db";
import { ETIQUETA_COMPANIA, useRatingsStore, type Valoracion } from "../stores/useRatingsStore";
import { useTripStore } from "../stores/useTripStore";
import { useUIStore } from "../stores/useUIStore";
import { formatDateShort } from "../utils/format";

/**
 * Todo lo que has puntuado y escrito, junto.
 *
 * Se podían escribir reseñas y no había forma de volver a leerlas salvo
 * encontrando otra vez el sitio en el mapa. Aquí están las de sitios y las de
 * rutas, de todos los viajes: las valoraciones viven fuera del viaje.
 */
export function MyReviewsPage() {
  const navigate = useNavigate();
  const valoraciones = useRatingsStore((s) => s.valoraciones);
  const stopsById = useTripStore((s) => s.stopsById);
  const savedTrips = useTripStore((s) => s.savedTrips);
  const openModal = useUIStore((s) => s.openModal);

  /**
   * El nombre no se guarda en la valoración, se busca: así renombrar una
   * parada no deja la reseña con el nombre viejo. Si el sitio ya no existe
   * —lo borraste— se dice, en vez de enseñar un identificador.
   */
  const nombreDe = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const [id, s] of Object.entries(stopsById)) mapa.set(`stop:${id}`, s.name);
    for (const w of Object.values(savedTrips)) {
      for (const [id, s] of Object.entries(w.stopsById)) mapa.set(`stop:${id}`, s.name);
    }
    for (const r of TODAS_LAS_RUTAS) mapa.set(`route:${r.id}`, r.name);
    return mapa;
  }, [stopsById, savedTrips]);

  const lista = Object.entries(valoraciones)
    .map(([clave, v]) => ({ clave, v }))
    .sort((a, b) => b.v.updatedAt.localeCompare(a.v.updatedAt));

  return (
    <div className="safe-x h-full overflow-y-auto bg-(--color-bg) px-4 pt-4 pb-8">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-(--color-text-muted)">
        <ArrowLeft size={15} aria-hidden="true" /> Atrás
      </button>
      <h1 className="mb-1 text-xl font-bold">Mis valoraciones</h1>
      <p className="mb-4 text-xs text-(--color-text-muted)">
        Lo que has puntuado, de sitios y de rutas. Son tuyas y se quedan aunque cambies de viaje.
      </p>

      {lista.length === 0 && (
        <p className="text-sm text-(--color-text-muted)">
          Aún no has puntuado nada. Toca las estrellas en una parada del Itinerario o en una ruta de Explorar.
        </p>
      )}

      <ul className="space-y-2">
        {lista.map(({ clave, v }) => {
          const nombre = nombreDe.get(clave);
          return (
            <li key={clave} className="rounded-(--radius-card) border bg-(--color-surface) p-3 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-(--color-text)">{nombre ?? "Un sitio que ya has borrado"}</p>
                  <p className="text-xs text-(--color-text-muted)">
                    {v.tipo === "route" ? "Ruta" : "Sitio"}
                    {v.fechaVisita && <> · {formatDateShort(v.fechaVisita)}</>}
                    {v.compania && <> · {ETIQUETA_COMPANIA[v.compania].toLowerCase()}</>}
                  </p>
                </div>
                <Estrellas n={v.estrellas} />
              </div>

              {v.comentario && <p className="mt-2 text-sm text-(--color-text)">{v.comentario}</p>}
              {v.consejo && <p className="mt-1 text-xs italic text-(--color-text-muted)">Consejo: {v.consejo}</p>}
              <Fotos ids={v.fotos} />

              {nombre && (
                <button
                  onClick={() => openModal({ type: "review", tipo: v.tipo, targetId: v.targetId, nombre })}
                  className="mt-2 flex items-center gap-1 text-xs font-medium text-(--color-navigation)"
                >
                  <PenLine size={12} aria-hidden="true" /> Editar
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Estrellas({ n }: { n: Valoracion["estrellas"] }) {
  return (
    <span className="flex shrink-0 items-center gap-0.5" aria-label={`${n} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={13}
          className={i <= n ? "text-(--color-gastronomy)" : "text-(--color-border)"}
          fill={i <= n ? "currentColor" : "none"}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

/** Miniaturas de la reseña. Se leen del almacén de fotos, no de la valoración. */
function Fotos({ ids }: { ids?: string[] }) {
  const fotos = useLiveQuery(async () => (ids?.length ? db.photos.where("id").anyOf(ids).toArray() : []), [ids?.join(",")]);
  if (!fotos?.length) return null;

  return (
    <div className="mt-2 flex gap-1.5">
      {fotos.map((f) => (
        <img key={f.id} src={f.thumbnailDataUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
      ))}
    </div>
  );
}
