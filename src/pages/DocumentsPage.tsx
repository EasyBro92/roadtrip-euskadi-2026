import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, ExternalLink, FileText, Paperclip, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DocumentService,
  ETIQUETA_TIPO,
  TIPOS_DOCUMENTO,
  type Documento,
  type TipoDocumento,
} from "../services/documents/DocumentService";
import { db } from "../services/storage/db";
import { useTripStore } from "../stores/useTripStore";
import { useUIStore } from "../stores/useUIStore";
import { formatDateShort } from "../utils/format";
import { openExternalUrl } from "../utils/openExternal";

/**
 * Reservas, entradas y billetes del viaje.
 *
 * El fichero se guarda dentro de la app, no como enlace al correo: la gracia
 * es abrir la confirmación del hotel al llegar, que es justo cuando puede que
 * no haya cobertura.
 */
export function DocumentsPage() {
  const navigate = useNavigate();
  const trip = useTripStore((s) => s.trip);
  const pushToast = useUIStore((s) => s.pushToast);
  const openModal = useUIStore((s) => s.openModal);

  const documentos = useLiveQuery(async () => DocumentService.listar(), []) ?? [];

  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<TipoDocumento>("reserva");
  const [localizador, setLocalizador] = useState("");
  const [dayId, setDayId] = useState<string>(trip.days[0]?.id ?? "");
  const [guardando, setGuardando] = useState(false);
  const inputFichero = useRef<HTMLInputElement>(null);

  async function anadir(fichero?: File) {
    if (!titulo.trim()) {
      pushToast("Ponle un nombre para saber qué es.", "info");
      return;
    }
    setGuardando(true);
    try {
      const dia = trip.days.find((d) => d.id === dayId);
      await DocumentService.guardar({ titulo: titulo.trim(), tipo, localizador: localizador.trim() || undefined, dayId: dayId || null, fecha: dia?.date }, fichero);
      setTitulo("");
      setLocalizador("");
      pushToast(fichero ? "Documento guardado." : "Datos guardados, sin fichero.", "success");
    } catch (error) {
      pushToast((error as Error).message, "error");
    } finally {
      setGuardando(false);
      if (inputFichero.current) inputFichero.current.value = "";
    }
  }

  async function abrir(doc: Documento) {
    const url = await DocumentService.urlDe(doc.id);
    if (!url) {
      pushToast("Este apunte no tiene fichero adjunto.", "info");
      return;
    }
    openExternalUrl(url);
    // Se suelta con margen: revocarla al instante cancela la apertura.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function borrar(doc: Documento) {
    openModal({
      type: "confirm",
      title: "Borrar documento",
      message: `¿Borrar "${doc.titulo}"? El fichero se pierde y no se puede recuperar.`,
      onConfirm: async () => {
        await DocumentService.borrar(doc.id);
        pushToast("Documento borrado.", "success");
      },
    });
  }

  const porDia = trip.days.map((d) => ({ dia: d, docs: documentos.filter((doc) => doc.dayId === d.id) }));
  const sueltos = documentos.filter((doc) => !doc.dayId || !trip.days.some((d) => d.id === doc.dayId));

  return (
    <div className="safe-x h-full overflow-y-auto bg-(--color-bg) px-4 pt-4 pb-8">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-(--color-text-muted)">
        <ArrowLeft size={15} aria-hidden="true" /> Atrás
      </button>
      <h1 className="mb-1 text-xl font-bold">Reservas y documentos</h1>
      <p className="mb-4 text-xs text-(--color-text-muted)">
        Se guardan dentro de la app, así que se abren sin cobertura. El aviso de "mañana entras al hotel" aparece al abrir la app: una PWA cerrada no puede hacer sonar nada.
      </p>

      <div className="mb-5 rounded-(--radius-card) border bg-(--color-surface) p-3" style={{ borderColor: "var(--color-border)" }}>
        <p className="mb-2 text-xs font-semibold uppercase text-(--color-text-muted)">Añadir</p>
        <div className="space-y-2">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Hotel Conde Duque, 2 noches"
            className="w-full rounded-lg border px-2.5 py-2 text-sm"
            style={{ borderColor: "var(--color-border)" }}
          />
          <div className="flex flex-wrap gap-2">
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoDocumento)} aria-label="Tipo" className="rounded-lg border px-2.5 py-2 text-sm" style={{ borderColor: "var(--color-border)" }}>
              {TIPOS_DOCUMENTO.map((t) => (
                <option key={t} value={t}>
                  {ETIQUETA_TIPO[t]}
                </option>
              ))}
            </select>
            <select value={dayId} onChange={(e) => setDayId(e.target.value)} aria-label="Día" className="rounded-lg border px-2.5 py-2 text-sm" style={{ borderColor: "var(--color-border)" }}>
              {trip.days.map((d, i) => (
                <option key={d.id} value={d.id}>
                  Día {i + 1} · {formatDateShort(d.date)}
                </option>
              ))}
            </select>
            <input
              value={localizador}
              onChange={(e) => setLocalizador(e.target.value)}
              placeholder="Localizador"
              className="min-w-[110px] flex-1 rounded-lg border px-2.5 py-2 text-sm"
              style={{ borderColor: "var(--color-border)" }}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => inputFichero.current?.click()}
              disabled={guardando}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-(--color-link)"
              style={{ borderColor: "var(--color-border)" }}
            >
              <Paperclip size={14} aria-hidden="true" /> Adjuntar PDF o foto
            </button>
            <button
              onClick={() => anadir()}
              disabled={guardando}
              className="flex items-center gap-1 rounded-lg bg-(--color-navigation) px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Plus size={14} aria-hidden="true" /> Sólo datos
            </button>
          </div>
        </div>
        <input
          ref={inputFichero}
          type="file"
          accept="application/pdf,image/*"
          hidden
          onChange={(e) => e.target.files?.[0] && anadir(e.target.files[0])}
        />
      </div>

      {documentos.length === 0 && <p className="text-sm text-(--color-text-muted)">Aún no has guardado ninguna reserva.</p>}

      {porDia.map(({ dia, docs }, i) =>
        docs.length === 0 ? null : (
          <section key={dia.id} className="mb-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">
              Día {i + 1} · {formatDateShort(dia.date)}
            </h2>
            <ul className="space-y-2">
              {docs.map((doc) => (
                <Ficha key={doc.id} doc={doc} onAbrir={abrir} onBorrar={borrar} />
              ))}
            </ul>
          </section>
        ),
      )}

      {sueltos.length > 0 && (
        <section className="mb-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">Sin día</h2>
          <ul className="space-y-2">
            {sueltos.map((doc) => (
              <Ficha key={doc.id} doc={doc} onAbrir={abrir} onBorrar={borrar} />
            ))}
          </ul>
        </section>
      )}

      <EspacioUsado />
    </div>
  );
}

function Ficha({ doc, onAbrir, onBorrar }: { doc: Documento; onAbrir: (d: Documento) => void; onBorrar: (d: Documento) => void }) {
  return (
    <li className="flex items-center gap-2 rounded-(--radius-card) border bg-(--color-surface) p-3" style={{ borderColor: "var(--color-border)" }}>
      <FileText size={17} className="shrink-0 text-(--color-text-muted)" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-(--color-text)">{doc.titulo}</p>
        <p className="truncate text-xs text-(--color-text-muted)">
          {ETIQUETA_TIPO[doc.tipo]}
          {doc.localizador && <> · {doc.localizador}</>}
          {!doc.nombreFichero && <> · sin fichero</>}
        </p>
      </div>
      {doc.nombreFichero && (
        <button onClick={() => onAbrir(doc)} aria-label={`Abrir ${doc.titulo}`} className="shrink-0 p-1.5 text-(--color-link)">
          <ExternalLink size={16} aria-hidden="true" />
        </button>
      )}
      <button onClick={() => onBorrar(doc)} aria-label={`Borrar ${doc.titulo}`} className="shrink-0 p-1.5 text-(--color-cancelled)">
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </li>
  );
}

function EspacioUsado() {
  const total = useLiveQuery(async () => {
    const todos = await db.documents.toArray();
    return todos.reduce((suma, d) => suma + (d.tamanoBytes ?? 0), 0);
  }, []);

  if (!total) return null;
  // En KB por debajo de un mega: "0.0 MB" no le dice nada a nadie.
  const tamano = total >= 1024 * 1024 ? `${(total / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(total / 1024))} KB`;
  return <p className="mt-2 text-[11px] text-(--color-text-muted)">Los documentos ocupan {tamano}.</p>;
}
