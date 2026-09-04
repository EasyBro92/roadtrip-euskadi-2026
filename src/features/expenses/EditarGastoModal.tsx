import { Camera, PiggyBank, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAnadirFotos } from "../../hooks/useAnadirFotos";
import { PhotoService } from "../../services/photos/PhotoService";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import type { ExpenseCategory } from "../../types";
import { formatEUR } from "../../utils/format";
import { CATEGORIAS_GASTO } from "./categorias";
import { diaDeLaFecha } from "./diaDelGasto";
import { useDuenoDelBote } from "./useDuenoDelBote";

/**
 * Editar un gasto ya apuntado.
 *
 * Un gasto se apunta con prisa, de pie y con el datáfono en la otra mano: es
 * normal poner mal el importe o la categoría. Antes sólo se podía borrar y
 * volver a escribirlo entero.
 */
export function EditarGastoModal({ expenseId }: { expenseId: string }) {
  const gasto = useTripStore((s) => s.expenses.find((e) => e.id === expenseId));
  const travelers = useTripStore((s) => s.trip.travelers);
  const dias = useTripStore((s) => s.trip.days);
  const aportaciones = useTripStore((s) => s.aportaciones);
  const updateExpense = useTripStore((s) => s.updateExpense);
  const closeModal = useUIStore((s) => s.closeModal);
  const pushToast = useUIStore((s) => s.pushToast);

  const [importe, setImporte] = useState(gasto ? String(gasto.amountEUR) : "");
  const [categoria, setCategoria] = useState<ExpenseCategory>(gasto?.category ?? "otros");
  const [lugar, setLugar] = useState(gasto?.place ?? "");
  const [fecha, setFecha] = useState(gasto?.date ?? "");
  const [delBote, setDelBote] = useState(Boolean(gasto?.pagadoDelBote));
  const [pagador, setPagador] = useState(gasto?.paidByTravelerId ?? travelers[0]?.id ?? "");
  /**
   * Entre quiénes se reparte.
   *
   * Por defecto todos, que es lo habitual, pero no siempre: si uno no cena,
   * esa cena no es suya. Repartir siempre entre todos es lo que hace que las
   * cuentas acaben sin cuadrar con la realidad.
   */
  const [entre, setEntre] = useState<string[]>(
    gasto?.splitBetweenTravelerIds?.length ? gasto.splitBetweenTravelerIds : travelers.map((t) => t.id),
  );

  /*
   * La foto del ticket.
   *
   * El campo estaba en los datos desde el principio pero no había dónde
   * tocarlo. Un ticket de gasolinera o de restaurante contesta solo las dudas
   * de dos días después: qué entraba en esos 84 €, o si la propina va aparte.
   *
   * Se pinta la miniatura que ya viene guardada con la foto, no el original:
   * abrir un JPEG de 1600 px dentro de un modal para verlo a 200 px de alto
   * es gastar memoria en el móvil para nada. La grande se abre al tocarla.
   */
  const [fotoId, setFotoId] = useState<string | null>(gasto?.receiptPhotoId ?? null);
  const [miniatura, setMiniatura] = useState<string | null>(null);
  /*
   * Sin día ni parada a propósito.
   *
   * Colgándola del día, el ticket entraba en la galería del Diario y llegó a
   * salir de portada: la foto que abre el día del Guggenheim era el recibo
   * del hotel. El ticket pertenece al gasto, y desde el gasto se encuentra.
   */
  const { abrir: abrirFoto, input: inputFoto, subiendo } = useAnadirFotos({ stopId: null, dayId: null }, (ids) =>
    setFotoId(ids[0] ?? null),
  );

  useEffect(() => {
    if (!fotoId) {
      setMiniatura(null);
      return;
    }
    let vigente = true;
    PhotoService.get(fotoId).then((foto) => {
      if (vigente) setMiniatura(foto?.thumbnailDataUrl ?? null);
    });
    return () => {
      vigente = false;
    };
  }, [fotoId]);

  /*
   * Reparto a medida: cuánto le toca a cada uno, escrito a mano.
   *
   * Partes iguales cubre casi todo, pero no dos noches de hotel de las que
   * uno duerme una, ni la cena en la que uno pidió marisco. Sin esto la
   * salida era apuntar gastos inventados hasta que la resta cuadrase.
   */
  const [aMedida, setAMedida] = useState(gasto?.splitCustomEUR != null);
  const [importes, setImportes] = useState<Record<string, string>>(() => {
    const guardado = gasto?.splitCustomEUR;
    const porCabeza = gasto && travelers.length > 0 ? gasto.amountEUR / travelers.length : 0;
    return Object.fromEntries(travelers.map((t) => [t.id, String(guardado?.[t.id] ?? Number(porCabeza.toFixed(2)))]));
  });
  if (!gasto) return null;

  const valor = Number.parseFloat(importe.replace(",", "."));
  const hayBote = aportaciones.length > 0;

  const cifra = (texto: string) => {
    const n = Number.parseFloat((texto || "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };
  const repartido = travelers.reduce((s, t) => s + cifra(importes[t.id]), 0);
  // Con el importe a medio escribir, `valor` es NaN: sin el 0 el aviso diría
  // "faltan NaN €".
  const descuadre = (Number.isFinite(valor) ? valor : 0) - repartido;
  // Con reparto a medida la suma tiene que dar el total: si no, los saldos
  // dejan de sumar cero y alguien paga de más sin que nadie cobre.
  const cuadra = !aMedida || Math.abs(descuadre) < 0.005;
  const valido = Number.isFinite(valor) && valor > 0 && cuadra;
  const dueno = useDuenoDelBote();

  function guardar() {
    if (!valido) return;
    updateExpense(expenseId, {
      amountEUR: valor,
      category: categoria,
      place: lugar.trim() || CATEGORIAS_GASTO.find((c) => c.id === categoria)!.etiqueta,
      date: fecha,
      // Cambiar la fecha mueve el gasto al día que le toca: si no, corregir la
      // fecha lo dejaba contando en el día equivocado del Diario.
      dayId: diaDeLaFecha(dias, fecha, gasto?.dayId ?? null),
      pagadoDelBote: delBote,
      receiptPhotoId: fotoId,
      // Del bote no lo paga nadie en concreto; quien lo puso ya está contado
      // en las aportaciones, y dejar un pagador aquí lo contaría dos veces.
      paidByTravelerId: delBote ? null : pagador || null,
      splitCustomEUR: aMedida ? Object.fromEntries(travelers.map((t) => [t.id, cifra(importes[t.id])])) : undefined,
      // Sin nadie marcado no se puede repartir: vuelve a ser de todos.
      splitBetweenTravelerIds: aMedida
        ? travelers.filter((t) => cifra(importes[t.id]) > 0).map((t) => t.id)
        : entre.length > 0
          ? entre
          : travelers.map((t) => t.id),
    });
    pushToast("Gasto actualizado.", "success");
    closeModal();
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/40" onClick={closeModal}>
      <div className="safe-bottom max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-(--color-surface) p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-(--color-text)">Editar gasto</h2>
          <button aria-label="Cerrar" onClick={closeModal} className="-mr-1 p-1">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <label className="mb-1 block text-xs font-medium text-(--color-text-muted)">Cuánto</label>
        <div className="relative mb-4">
          <input
            value={importe}
            onChange={(e) => setImporte(e.target.value)}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            className="w-full rounded-(--radius-control) border bg-(--color-bg) py-2.5 pl-3 pr-8 text-2xl font-medium tracking-tight text-(--color-text)"
            style={{ borderColor: "var(--color-border)" }}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-lg text-(--color-text-muted)">€</span>
        </div>

        <label className="mb-1 block text-xs font-medium text-(--color-text-muted)">En qué</label>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {CATEGORIAS_GASTO.map((c) => {
            const activa = categoria === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCategoria(c.id)}
                aria-pressed={activa}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${activa ? "font-medium text-white" : "bg-(--color-surface) text-(--color-text)"}`}
                style={activa ? { background: c.color, borderColor: c.color } : { borderColor: "var(--color-border)" }}
              >
                {!activa && <span className="h-2 w-2 rounded-full" style={{ background: c.color }} aria-hidden="true" />}
                {c.corta}
              </button>
            );
          })}
        </div>

        <label className="mb-1 block text-xs font-medium text-(--color-text-muted)">Dónde</label>
        <input
          value={lugar}
          onChange={(e) => setLugar(e.target.value)}
          className="mb-4 w-full rounded-(--radius-control) border bg-(--color-bg) px-3 py-2.5 text-sm text-(--color-text)"
          style={{ borderColor: "var(--color-border)" }}
        />

        <label className="mb-1 block text-xs font-medium text-(--color-text-muted)">Cuándo</label>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="mb-4 w-full rounded-(--radius-control) border bg-(--color-bg) px-3 py-2.5 text-sm text-(--color-text)"
          style={{ borderColor: "var(--color-border)" }}
        />

        <label className="mb-1 block text-xs font-medium text-(--color-text-muted)">Quién lo pagó</label>
        <div className="mb-5 flex flex-wrap gap-1.5">
          {hayBote && (
            <button
              onClick={() => setDelBote(true)}
              aria-pressed={delBote}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${delBote ? "border-(--color-navigation) bg-(--color-navigation) font-medium text-white" : "bg-(--color-surface) text-(--color-text)"}`}
              style={!delBote ? { borderColor: "var(--color-border)" } : undefined}
            >
              <PiggyBank size={13} aria-hidden="true" /> {dueno ? <>El bote de {dueno}</> : "El bote"}
            </button>
          )}
          {travelers.map((t) => {
            const activo = !delBote && pagador === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setDelBote(false);
                  setPagador(t.id);
                }}
                aria-pressed={activo}
                className={`rounded-full border px-3 py-1.5 text-sm ${activo ? "border-(--color-navigation) bg-(--color-navigation) font-medium text-white" : "bg-(--color-surface) text-(--color-text)"}`}
                style={!activo ? { borderColor: "var(--color-border)" } : undefined}
              >
                {t.name}
              </button>
            );
          })}
        </div>

        {travelers.length > 1 && (
          <>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-(--color-text-muted)">Cómo se reparte</label>
              <div className="flex overflow-hidden rounded-full border" style={{ borderColor: "var(--color-border)" }}>
                {[
                  { id: false, etiqueta: "Igual" },
                  { id: true, etiqueta: "A medida" },
                ].map((m) => (
                  <button
                    key={String(m.id)}
                    onClick={() => setAMedida(m.id)}
                    aria-pressed={aMedida === m.id}
                    className={`px-3 py-1 text-xs ${aMedida === m.id ? "bg-(--color-navigation) font-medium text-white" : "text-(--color-text-muted)"}`}
                  >
                    {m.etiqueta}
                  </button>
                ))}
              </div>
            </div>

            {aMedida ? (
              <div className="mb-5">
                {travelers.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 border-b py-2 last:border-b-0" style={{ borderColor: "var(--color-border)" }}>
                    <span className="min-w-0 flex-1 truncate text-sm text-(--color-text)">{t.name}</span>
                    <div className="relative w-28 shrink-0">
                      <input
                        value={importes[t.id] ?? ""}
                        onChange={(e) => setImportes((v) => ({ ...v, [t.id]: e.target.value }))}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        aria-label={`Cuánto le toca a ${t.name}`}
                        className="w-full rounded-(--radius-control) border bg-(--color-bg) py-1.5 pl-2.5 pr-6 text-right text-sm text-(--color-text)"
                        style={{ borderColor: "var(--color-border)" }}
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-(--color-text-muted)">€</span>
                    </div>
                  </div>
                ))}

                {/* El descuadre se dice en euros y se arregla de un toque: es
                    el único error que impide guardar, y buscarlo a mano en
                    cuatro casillas es justo lo que hace abandonar. */}
                {!cuadra && (
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                    <span className="text-(--color-cancelled)">
                      {descuadre > 0 ? (
                        <>Faltan {formatEUR(descuadre)} por repartir de los {formatEUR(valor || 0)}.</>
                      ) : (
                        <>Te pasas {formatEUR(-descuadre)}: sumáis {formatEUR(repartido)} y el gasto es de {formatEUR(valor || 0)}.</>
                      )}
                    </span>
                    <button
                      onClick={() => {
                        const cada = (valor || 0) / travelers.length;
                        setImportes(Object.fromEntries(travelers.map((t) => [t.id, cada.toFixed(2)])));
                      }}
                      className="shrink-0 font-medium text-(--color-link)"
                    >
                      Repartir igual
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="mb-5 flex flex-wrap gap-1.5">
                  {travelers.map((t) => {
                    const dentro = entre.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => setEntre((v) => (dentro ? v.filter((x) => x !== t.id) : [...v, t.id]))}
                        aria-pressed={dentro}
                        className={`rounded-full border px-3 py-1.5 text-sm ${dentro ? "border-(--color-progress) bg-(--color-progress) font-medium text-white" : "bg-(--color-surface) text-(--color-text-muted)"}`}
                        style={!dentro ? { borderColor: "var(--color-border)" } : undefined}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
                {entre.length > 0 && entre.length < travelers.length && (
                  <p className="-mt-4 mb-5 text-xs text-(--color-text-muted)">
                    {formatEUR(valido ? valor / entre.length : 0)} cada uno, entre {entre.length} de {travelers.length}.
                  </p>
                )}
              </>
            )}
          </>
        )}

        <label className="mb-1 block text-xs font-medium text-(--color-text-muted)">Ticket</label>
        {miniatura ? (
          <div className="mb-5 flex items-center gap-3">
            <button
              onClick={async () => {
                const url = await PhotoService.getObjectUrl(fotoId!);
                if (url) window.open(url, "_blank", "noopener");
              }}
              className="shrink-0 overflow-hidden rounded-xl border"
              style={{ borderColor: "var(--color-border)" }}
              aria-label="Ver el ticket en grande"
            >
              <img src={miniatura} alt="Ticket del gasto" className="h-20 w-20 object-cover" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-(--color-text-muted)">Tócalo para verlo en grande.</p>
              <button onClick={() => setFotoId(null)} className="mt-1 flex items-center gap-1 text-xs text-(--color-cancelled)">
                <Trash2 size={12} aria-hidden="true" /> Quitar el ticket
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={abrirFoto}
            disabled={subiendo}
            className="mb-5 flex w-full items-center justify-center gap-1.5 rounded-(--radius-control) border border-dashed py-3 text-sm text-(--color-text-muted) disabled:opacity-50"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Camera size={15} aria-hidden="true" /> {subiendo ? "Guardando…" : "Foto del ticket"}
          </button>
        )}
        {inputFoto}

        <button
          onClick={guardar}
          disabled={!valido}
          className="w-full rounded-full bg-(--color-navigation) py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
