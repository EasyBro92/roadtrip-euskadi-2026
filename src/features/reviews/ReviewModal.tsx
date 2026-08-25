import { Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { StarRatingInput } from "../../components/StarRatingInput";
import { PhotoService } from "../../services/photos/PhotoService";
import {
  COMPANIAS,
  ETIQUETA_COMPANIA,
  useRatingsStore,
  type Compania,
  type TipoValorado,
} from "../../stores/useRatingsStore";
import { useUIStore } from "../../stores/useUIStore";
import { toISODate } from "../../utils/dates";

const MAX_FOTOS = 6;

/**
 * Reseña completa de un sitio o de una ruta: estrellas, texto, fotos tuyas,
 * cuándo fuiste, con quién y un consejo.
 *
 * Las fotos no se guardan aquí: van a `PhotoService`, que las comprime y las
 * mete en IndexedDB, y la reseña sólo se queda con sus identificadores. Meter
 * imágenes en el almacén de valoraciones lo haría enorme y lo dejaría inútil
 * para sincronizar el día que haya servidor.
 */
export function ReviewModal({ tipo, targetId, nombre }: { tipo: TipoValorado; targetId: string; nombre: string }) {
  const closeModal = useUIStore((s) => s.closeModal);
  const pushToast = useUIStore((s) => s.pushToast);
  const existente = useRatingsStore((s) => s.valoraciones[`${tipo}:${targetId}`]);
  const guardarResena = useRatingsStore((s) => s.guardarResena);
  const estrellas = existente?.estrellas;

  const [comentario, setComentario] = useState(existente?.comentario ?? "");
  const [consejo, setConsejo] = useState(existente?.consejo ?? "");
  const [fechaVisita, setFechaVisita] = useState(existente?.fechaVisita ?? toISODate(new Date()));
  const [compania, setCompania] = useState<Compania | undefined>(existente?.compania);
  const [fotos, setFotos] = useState<string[]>(existente?.fotos ?? []);
  const [miniaturas, setMiniaturas] = useState<Record<string, string>>({});
  const [subiendo, setSubiendo] = useState(false);
  const inputFichero = useRef<HTMLInputElement>(null);

  // Las miniaturas son URLs de objeto: hay que soltarlas al cerrar o el
  // navegador se queda con los blobs en memoria.
  useEffect(() => {
    let vigente = true;
    const creadas: string[] = [];
    (async () => {
      const mapa: Record<string, string> = {};
      for (const id of fotos) {
        const url = await PhotoService.getObjectUrl(id);
        if (url) {
          mapa[id] = url;
          creadas.push(url);
        }
      }
      if (vigente) setMiniaturas(mapa);
    })();
    return () => {
      vigente = false;
      creadas.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [fotos]);

  async function anadirFotos(ficheros: FileList | null) {
    if (!ficheros?.length) return;
    const hueco = MAX_FOTOS - fotos.length;
    if (hueco <= 0) {
      pushToast(`Máximo ${MAX_FOTOS} fotos por reseña.`, "info");
      return;
    }

    setSubiendo(true);
    try {
      const nuevas: string[] = [];
      for (const fichero of [...ficheros].slice(0, hueco)) {
        // Las fotos de una reseña de ruta no cuelgan de ninguna parada.
        const foto = await PhotoService.addUserPhoto(fichero, { stopId: tipo === "stop" ? targetId : null, dayId: null });
        nuevas.push(foto.id);
      }
      setFotos((previas) => [...previas, ...nuevas]);
    } catch (error) {
      pushToast(`No se pudo añadir la foto: ${(error as Error).message}`, "error");
    } finally {
      setSubiendo(false);
      if (inputFichero.current) inputFichero.current.value = "";
    }
  }

  async function quitarFoto(id: string) {
    setFotos((previas) => previas.filter((f) => f !== id));
    await PhotoService.remove(id);
  }

  function guardar() {
    if (!estrellas) {
      pushToast("Pon primero cuántas estrellas le das.", "info");
      return;
    }
    guardarResena(tipo, targetId, estrellas, { comentario, consejo, fechaVisita, compania, fotos });
    pushToast(`Reseña de ${nombre} guardada.`, "success");
    closeModal();
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/40" onClick={closeModal}>
      <div
        className="safe-bottom max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-(--color-surface) p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-(--color-text)">Tu reseña</h2>
            <p className="truncate text-sm text-(--color-text-muted)">{nombre}</p>
          </div>
          <button aria-label="Cerrar" onClick={closeModal} className="-mr-1 p-1">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: "var(--color-border)" }}>
          <StarRatingInput tipo={tipo} targetId={targetId} nombre={nombre} size={26} etiqueta={false} />
          {!estrellas && <span className="text-xs text-(--color-text-muted)">Toca para puntuar</span>}
        </div>

        <label className="mb-1 block text-xs font-medium text-(--color-text-muted)">Qué te pareció</label>
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={4}
          placeholder="Lo que le contarías a alguien que va a ir."
          className="mb-4 w-full rounded-(--radius-control) border bg-(--color-bg) px-3 py-2.5 text-sm text-(--color-text)"
          style={{ borderColor: "var(--color-border)" }}
        />

        <label className="mb-1 block text-xs font-medium text-(--color-text-muted)">Un consejo</label>
        <input
          value={consejo}
          onChange={(e) => setConsejo(e.target.value)}
          placeholder="Ve temprano, aparca en la plaza…"
          className="mb-4 w-full rounded-(--radius-control) border bg-(--color-bg) px-3 py-2.5 text-sm text-(--color-text)"
          style={{ borderColor: "var(--color-border)" }}
        />

        <label className="mb-1 block text-xs font-medium text-(--color-text-muted)">Cuándo fuiste</label>
        <input
          type="date"
          value={fechaVisita}
          onChange={(e) => setFechaVisita(e.target.value)}
          className="mb-4 w-full rounded-(--radius-control) border bg-(--color-bg) px-3 py-2.5 text-sm text-(--color-text)"
          style={{ borderColor: "var(--color-border)" }}
        />

        <label className="mb-1 block text-xs font-medium text-(--color-text-muted)">Con quién</label>
        <div className="mb-4 flex flex-wrap gap-2">
          {COMPANIAS.map((c) => {
            const elegida = compania === c;
            return (
              <button
                key={c}
                // Volver a tocar la elegida la quita: no siempre quieres decirlo.
                onClick={() => setCompania(elegida ? undefined : c)}
                aria-pressed={elegida}
                className={`rounded-full border px-3 py-1.5 text-sm ${elegida ? "border-(--color-navigation) bg-(--color-navigation) text-white" : "bg-(--color-surface)"}`}
                style={!elegida ? { borderColor: "var(--color-border)" } : undefined}
              >
                {ETIQUETA_COMPANIA[c]}
              </button>
            );
          })}
        </div>

        <label className="mb-1 block text-xs font-medium text-(--color-text-muted)">
          Tus fotos ({fotos.length}/{MAX_FOTOS})
        </label>
        <div className="mb-1 flex flex-wrap gap-2">
          {fotos.map((id) => (
            <div key={id} className="relative h-20 w-20 overflow-hidden rounded-xl bg-(--color-surface-muted)">
              {miniaturas[id] && <img src={miniaturas[id]} alt="" className="h-full w-full object-cover" />}
              <button
                aria-label="Quitar foto"
                onClick={() => quitarFoto(id)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white"
              >
                <Trash2 size={13} aria-hidden="true" />
              </button>
            </div>
          ))}
          {fotos.length < MAX_FOTOS && (
            <button
              onClick={() => inputFichero.current?.click()}
              disabled={subiendo}
              className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed text-xs text-(--color-text-muted)"
              style={{ borderColor: "var(--color-border)" }}
            >
              {subiendo ? "…" : "Añadir"}
            </button>
          )}
        </div>
        <input ref={inputFichero} type="file" accept="image/*" multiple hidden onChange={(e) => anadirFotos(e.target.files)} />
        <p className="mb-4 text-[11px] text-(--color-text-muted)">
          Se guardan reducidas dentro de la app, no en la galería del móvil.
        </p>

        <button
          onClick={guardar}
          className="w-full rounded-full bg-(--color-navigation) py-3 text-sm font-medium text-white transition-transform active:scale-[0.98]"
        >
          Guardar reseña
        </button>
      </div>
    </div>
  );
}
