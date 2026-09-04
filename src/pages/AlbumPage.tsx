import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, ImageOff, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Vacio } from "../components/Vacio";
import { useDaySwipe } from "../hooks/useDaySwipe";
import { AlbumService } from "../services/album/AlbumService";
import { fotosDelAlbum } from "../services/album/flatFotos";
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

  /*
   * El mismo orden en que se pinta la página, aplanado en una sola lista.
   *
   * Antes tocar una foto no hacía nada: para verla más grande no había ni
   * dónde tocar. Con esta lista, cualquier foto del álbum —portada o de la
   * cuadrícula— abre el visor exactamente donde estaba, y deslizar pasa a la
   * siguiente sin volver atrás para elegirla.
   */
  const flatFotos = useMemo(() => {
    return fotosDelAlbum(
      trip.days.map((dia) => {
        const paradas = dia.stopIds.map((id) => stopsById[id]).filter((s) => s?.enabled);
        const fotosDelDia = fotosDe(dia.id);
        return { portada: fotosDelDia[0] ?? paradas.find((p) => p?.heroImage)?.heroImage, extras: fotosDelDia.slice(1) };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.days, stopsById, urls]);

  const [indiceAbierto, setIndiceAbierto] = useState<number | null>(null);

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
                {portada && (
                  <button
                    onClick={() => setIndiceAbierto(flatFotos.indexOf(portada))}
                    aria-label={`Ver la foto de portada del día ${dia.index + 1} en grande`}
                    className="block w-full"
                  >
                    <img src={portada} alt="" className="h-40 w-full object-cover" />
                  </button>
                )}

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
                      <button key={url} onClick={() => setIndiceAbierto(flatFotos.indexOf(url))} aria-label="Ver foto en grande">
                        <img src={url} alt="" className="h-32 w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {indiceAbierto !== null && (
        <VisorFotos
          fotos={flatFotos}
          indice={indiceAbierto}
          onCerrar={() => setIndiceAbierto(null)}
          onCambiar={setIndiceAbierto}
        />
      )}
    </div>
  );
}

/**
 * El visor a pantalla completa: una foto detrás de otra, como una galería de
 * verdad.
 *
 * Antes no había ningún sitio del álbum donde tocar una foto la hiciera más
 * grande: la única forma de verla entera era salir de la app y buscarla en
 * la galería del móvil. Aquí se desliza para pasar a la siguiente sin volver
 * a la lista a elegir otra — el mismo gesto que ya usa el Diario para
 * cambiar de día, reutilizado para pasar de foto.
 */
function VisorFotos({
  fotos,
  indice,
  onCerrar,
  onCambiar,
}: {
  fotos: string[];
  indice: number;
  onCerrar: () => void;
  onCambiar: (indice: number) => void;
}) {
  const swipe = useDaySwipe({
    onPrev: () => indice > 0 && onCambiar(indice - 1),
    onNext: () => indice < fotos.length - 1 && onCambiar(indice + 1),
  });

  return (
    <div className="fixed inset-0 z-[2200] flex flex-col bg-black" onClick={onCerrar}>
      <div className="safe-top flex shrink-0 items-center justify-between px-4 py-3">
        <span className="text-sm font-medium text-white/70">
          {indice + 1} / {fotos.length}
        </span>
        <button
          aria-label="Cerrar"
          onClick={onCerrar}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Deslizar cambia de foto; tocar la imagen no cierra el visor, sólo
          tocar fuera (el fondo) o la X. Así no se pierde una foto a medio
          ver por un toque de más mientras se desliza. */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center"
        style={{ touchAction: "pan-y" }}
        onClick={(e) => e.stopPropagation()}
        {...swipe}
      >
        <img src={fotos[indice]} alt="" className="max-h-full max-w-full object-contain" />

        {indice > 0 && (
          <button
            aria-label="Foto anterior"
            onClick={() => onCambiar(indice - 1)}
            className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white"
          >
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
        )}
        {indice < fotos.length - 1 && (
          <button
            aria-label="Foto siguiente"
            onClick={() => onCambiar(indice + 1)}
            className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white"
          >
            <ChevronRight size={22} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
