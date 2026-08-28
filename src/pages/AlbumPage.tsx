import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Download, ImageOff, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Vacio } from "../components/Vacio";
import { AlbumService } from "../services/album/AlbumService";
import { db } from "../services/storage/db";
import { useRatingsStore } from "../stores/useRatingsStore";
import { useTripStore } from "../stores/useTripStore";
import { useUIStore } from "../stores/useUIStore";
import { formatDateLong, formatEUR } from "../utils/format";

/** Los bytes en algo que se pueda leer antes de mandarlo por WhatsApp. */
function pesa(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const ESTRELLAS = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

/**
 * El viaje entero seguido, para leerlo como se lee un álbum.
 *
 * El Diario enseña un día cada vez, que es lo que hace falta mientras viajas.
 * Cuando vuelves lo que quieres es lo contrario: pasarlo entero de un tirón y
 * poder enseñárselo a alguien. Y poder dárselo, que es lo que hace el botón
 * de guardar: un solo fichero que se abre sin la app y sin conexión.
 */
export function AlbumPage() {
  const navigate = useNavigate();
  const trip = useTripStore((s) => s.trip);
  const stopsById = useTripStore((s) => s.stopsById);
  const notes = useTripStore((s) => s.notes);
  const expenses = useTripStore((s) => s.expenses);
  const valoraciones = useRatingsStore((s) => s.valoraciones);
  const pushToast = useUIStore((s) => s.pushToast);

  const [guardando, setGuardando] = useState(false);
  const fotos = useLiveQuery(() => db.photos.toArray(), []);

  const estrellasDe = (stopId: string) => valoraciones[`stop:${stopId}`]?.estrellas ?? 0;
  const notaDe = (tipo: "day" | "stop", id: string) => notes.find((n) => n.targetType === tipo && n.targetId === id)?.text?.trim();

  /*
   * Una URL por foto, creada una vez y revocada al salir.
   *
   * Creándolas al pintar, cada repintado del álbum dejaba una copia de cada
   * foto en memoria: con cinco días de fotos el móvil acaba echando la
   * pestaña abajo.
   */
  const urls = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const f of fotos ?? []) if (f.blob && f.dayId) mapa.set(f.id, URL.createObjectURL(f.blob));
    return mapa;
  }, [fotos]);

  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  const fotosDe = (dayId: string) => (fotos ?? []).filter((f) => f.dayId === dayId).map((f) => urls.get(f.id)).filter((u): u is string => Boolean(u));

  const totalFotos = urls.size;

  async function guardar() {
    setGuardando(true);
    try {
      const { fotos: cuantas, bytes, sinIncrustar } = await AlbumService.descargarHtml({ trip, stopsById, notes, expenses, estrellasDe });
      // Si alguna portada se quedó fuera hay que decirlo: el álbum sirve igual,
      // pero esas fotos necesitarán conexión para verse.
      pushToast(
        sinIncrustar > 0
          ? `Álbum guardado (${pesa(bytes)}), pero ${sinIncrustar} ${sinIncrustar === 1 ? "portada necesitará" : "portadas necesitarán"} conexión. Vuelve a guardarlo con datos para meterlas dentro.`
          : `Álbum guardado: ${cuantas} fotos, ${pesa(bytes)}.`,
        sinIncrustar > 0 ? "info" : "success",
      );
    } catch (error) {
      pushToast(`No se pudo guardar el álbum: ${(error as Error).message}`, "error");
    } finally {
      setGuardando(false);
    }
  }

  const visitadas = Object.values(stopsById).filter((s) => s.visited).length;
  const totalGasto = expenses.filter((e) => e.kind === "actual").reduce((s, e) => s + e.amountEUR, 0);

  return (
    <div className="safe-x h-full overflow-y-auto bg-(--color-bg) px-4 pt-4 pb-8">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-(--color-text-muted)">
        <ArrowLeft size={15} aria-hidden="true" /> Atrás
      </button>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold">Álbum del viaje</h1>
          <p className="mt-0.5 text-xs text-(--color-text-muted)">
            {visitadas} {visitadas === 1 ? "parada visitada" : "paradas visitadas"} · {totalFotos} {totalFotos === 1 ? "foto" : "fotos"}
            {totalGasto > 0 && <> · {formatEUR(totalGasto)}</>}
          </p>
        </div>
        <button
          onClick={guardar}
          disabled={guardando}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-(--color-navigation) px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {guardando ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Download size={13} aria-hidden="true" />}
          {guardando ? "Preparando…" : "Guardar"}
        </button>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-(--color-text-muted)">
        Guardar deja el viaje entero en un solo archivo que se abre sin la app y sin conexión: las fotos van dentro, algo más
        pequeñas para que se pueda mandar. Las portadas de las paradas se descargan de Wikimedia al guardarlo, así que hazlo con
        datos. Tus originales siguen aquí y se bajan aparte con el ZIP de fotos.
      </p>

      {trip.days.every((d) => d.stopIds.length === 0) ? (
        <Vacio icon={ImageOff} titulo="Todavía no hay nada que enseñar" texto="Cuando el viaje tenga paradas y fotos, el álbum se llena solo." />
      ) : (
        <div className="mt-4 space-y-4">
          {trip.days.map((dia) => {
            const paradas = dia.stopIds.map((id) => stopsById[id]).filter((s) => s?.enabled);
            const fotosDelDia = fotosDe(dia.id);
            const portada = fotosDelDia[0] ?? paradas.find((p) => p?.heroImage)?.heroImage;
            const gasto = expenses.filter((e) => e.dayId === dia.id && e.kind === "actual").reduce((s, e) => s + e.amountEUR, 0);
            const relato = notaDe("day", dia.id);

            return (
              <section
                key={dia.id}
                className="overflow-hidden rounded-(--radius-card) border bg-(--color-surface) shadow-(--shadow-card)"
                style={{ borderColor: "var(--color-border)" }}
              >
                {portada && <img src={portada} alt="" className="h-40 w-full object-cover" />}

                <div className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-(--color-text-muted)">
                    Día {dia.index + 1} · {formatDateLong(dia.date)}
                  </p>
                  <h2 className="mt-0.5 text-lg font-semibold text-(--color-text)">{dia.title || dia.city || `Día ${dia.index + 1}`}</h2>
                  <p className="text-xs text-(--color-text-muted)">
                    {paradas.length} {paradas.length === 1 ? "parada" : "paradas"}
                    {gasto > 0 && <> · {formatEUR(gasto)}</>}
                  </p>

                  {relato && <p className="mt-2.5 whitespace-pre-wrap text-sm text-(--color-text)">{relato}</p>}

                  <ol className="mt-3">
                    {paradas.map((p) => {
                      const estrellas = estrellasDe(p.id);
                      const nota = notaDe("stop", p.id);
                      return (
                        <li key={p.id} className="border-t py-2 first:border-t-0" style={{ borderColor: "var(--color-border)" }}>
                          <p className="text-sm font-medium text-(--color-text)">
                            {p.name}
                            {p.visited && <span className="text-(--color-completed)"> ✓</span>}
                          </p>
                          <p className="text-xs capitalize text-(--color-text-muted)">
                            {p.category}
                            {estrellas > 0 && <span className="ml-1.5 tracking-widest text-(--color-gastronomy)">{ESTRELLAS(estrellas)}</span>}
                          </p>
                          {nota && <p className="mt-1 whitespace-pre-wrap text-xs text-(--color-text-muted)">{nota}</p>}
                        </li>
                      );
                    })}
                  </ol>
                </div>

                {fotosDelDia.length > 1 && (
                  <div className="grid grid-cols-2 gap-0.5">
                    {fotosDelDia.slice(1).map((url) => (
                      <img key={url} src={url} alt="" className="h-32 w-full object-cover" />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
