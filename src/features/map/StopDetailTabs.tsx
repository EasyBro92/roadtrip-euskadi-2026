import { useLiveQuery } from "dexie-react-hooks";
import { BedDouble, CloudRain, Globe, Info, ParkingCircle, Phone, Plus, UtensilsCrossed } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { usePlaceDetails } from "../../hooks/usePlaceDetails";
import { PhotoService } from "../../services/photos/PhotoService";
import { db } from "../../services/storage/db";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore, type StopDetailTab } from "../../stores/useUIStore";
import type { Stop } from "../../types";
import { fechaLocal, formatEUR } from "../../utils/format";
import { openExternalUrl } from "../../utils/openExternal";
import { estadoDeApertura } from "../../utils/openingHours";

const TABS: { id: StopDetailTab; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "que-ver", label: "Qué ver" },
  { id: "fotos", label: "Fotografías" },
  { id: "gastronomia", label: "Gastronomía" },
  { id: "hotel", label: "Alojamiento" },
  { id: "aparcamiento", label: "Aparcamiento" },
  { id: "notas", label: "Notas" },
  { id: "gastos", label: "Gastos" },
  { id: "lluvia", label: "Plan de lluvia" },
  { id: "practica", label: "Información práctica" },
];

export function StopDetailTabs({ stop }: { stop: Stop }) {
  const activeTab = useUIStore((s) => s.stopDetailTab);
  const setActiveTab = useUIStore((s) => s.setStopDetailTab);

  // La pestaña de alojamiento solo tiene sentido donde hay opciones de hotel.
  const visibleTabs = TABS.filter((t) => (t.id === "hotel" ? stop.hotelOptions.length > 0 : true));

  return (
    <div className="mt-4">
      <div className="flex gap-5 overflow-x-auto border-b scrollbar-none" style={{ borderColor: "var(--color-border)" }}>
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 whitespace-nowrap border-b-2 px-0.5 pb-2.5 text-sm font-medium ${
              activeTab === tab.id ? "border-(--color-navigation) text-(--color-link)" : "border-transparent text-(--color-text-muted)"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-3 text-sm">
        {activeTab === "resumen" && <ResumenTab stop={stop} />}
        {activeTab === "que-ver" && <QueVerTab stop={stop} />}
        {activeTab === "fotos" && <FotosTab stop={stop} />}
        {activeTab === "gastronomia" && <GastronomiaTab stop={stop} />}
        {activeTab === "hotel" && <HotelTab stop={stop} />}
        {activeTab === "aparcamiento" && <AparcamientoTab stop={stop} />}
        {activeTab === "notas" && <NotasTab stop={stop} />}
        {activeTab === "gastos" && <GastosTab stop={stop} />}
        {activeTab === "lluvia" && <LluviaTab stop={stop} />}
        {activeTab === "practica" && <PracticaTab stop={stop} />}
      </div>
    </div>
  );
}

function ResumenTab({ stop }: { stop: Stop }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="space-y-2">
      <p className="text-(--color-text)">{expanded ? stop.fullDescription : stop.shortDescription}</p>
      {stop.fullDescription && stop.fullDescription !== stop.shortDescription && (
        <button onClick={() => setExpanded((v) => !v)} className="text-xs font-semibold text-(--color-link)">
          {expanded ? "Ver menos" : "Ver más"}
        </button>
      )}
      {stop.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {stop.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-(--color-surface-muted) px-2.5 py-1 text-xs text-(--color-text-muted)">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function QueVerTab({ stop }: { stop: Stop }) {
  if (stop.highlights.length === 0) return <EmptyState message="No hay puntos destacados registrados todavía para esta parada." />;
  return (
    <ul className="list-inside list-disc space-y-1 text-(--color-text)">
      {stop.highlights.map((h) => (
        <li key={h}>{h}</li>
      ))}
    </ul>
  );
}

function FotosTab({ stop }: { stop: Stop }) {
  const photos = useLiveQuery(() => db.photos.where("stopId").equals(stop.id).toArray(), [stop.id]);
  const inputRef = useRef<HTMLInputElement>(null);
  const pushToast = useUIStore((s) => s.pushToast);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      try {
        await PhotoService.addUserPhoto(file, { stopId: stop.id, dayId: stop.dayId });
      } catch (error) {
        pushToast(`No se pudo guardar la foto: ${(error as Error).message}`, "error");
      }
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-(--color-text-muted)">Valor fotográfico: {stop.photographyRating}/5</span>
        <button onClick={() => inputRef.current?.click()} className="flex items-center gap-1 text-xs font-semibold text-(--color-link)">
          <Plus size={14} aria-hidden="true" /> Añadir foto
        </button>
        <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>
      {stop.photoTip?.bestPoint && <p className="mb-2 text-xs text-(--color-text-muted)">Consejo: {stop.photoTip.bestPoint}</p>}
      {!photos || photos.length === 0 ? (
        <EmptyState message="Todavía no hay fotos propias en esta parada." />
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {photos.map((photo) => (
            <img key={photo.id} src={photo.thumbnailDataUrl} alt={photo.description || stop.name} className="aspect-square w-full rounded-lg object-cover" />
          ))}
        </div>
      )}
    </div>
  );
}

function GastronomiaTab({ stop }: { stop: Stop }) {
  if (stop.restaurantOptions.length === 0) return <EmptyState message="Sin recomendaciones gastronómicas registradas aquí." icon={UtensilsCrossed} />;
  return (
    <div className="space-y-2">
      {stop.restaurantOptions.map((r) => (
        <div key={r.id} className="rounded-xl border p-2.5" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center justify-between">
            <span className="font-medium">{r.name}</span>
            <span className="text-xs uppercase text-(--color-text-muted)">{r.tier}</span>
          </div>
          {r.typicalDish && <p className="text-xs text-(--color-text-muted)">{r.typicalDish}</p>}
          <div className="mt-1 flex items-center justify-between text-xs">
            <span>{r.priceEstimateEUR ? `${formatEUR(r.priceEstimateEUR)} aprox./persona` : "Precio sin verificar"}</span>
            {r.source === "demo" && <span className="rounded-full bg-(--color-optional)/20 px-2 py-0.5 text-(--color-text-muted)">Demo</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

const HOTEL_ROLE_LABEL: Record<string, string> = {
  propuesto: "Propuesto",
  "alternativa-economica": "Más económico",
  "alternativa-aparcamiento": "Con aparcamiento",
};

/**
 * Elegir un alojamiento distinto actualiza la parada en vivo (nombre y
 * coste previsto): el mapa, el itinerario, el diario y los gastos se
 * adaptan solos porque todos leen del mismo estado.
 */
function HotelTab({ stop }: { stop: Stop }) {
  const updateStop = useTripStore((s) => s.updateStop);
  const pushToast = useUIStore((s) => s.pushToast);

  if (stop.hotelOptions.length === 0) return <EmptyState message="Sin alojamientos registrados en esta parada." icon={BedDouble} />;

  const selectedName = stop.name;

  return (
    <div className="space-y-2">
      {stop.hotelOptions.map((h) => {
        const isSelected = selectedName === h.name;
        return (
          <button
            key={h.id}
            onClick={() => {
              updateStop(stop.id, { name: h.name, expectedCostEUR: h.priceEstimateEUR });
              pushToast(`Alojamiento cambiado a ${h.name}. Itinerario y gastos actualizados.`, "success");
            }}
            className="w-full rounded-xl border p-3 text-left transition-colors"
            style={{ borderColor: isSelected ? "var(--color-navigation)" : "var(--color-border)", background: isSelected ? "color-mix(in srgb, var(--color-navigation) 8%, transparent)" : undefined }}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0 flex-1 truncate font-medium">{h.name}</span>
              <span className="shrink-0 text-xs text-(--color-text-muted)">{HOTEL_ROLE_LABEL[h.role] ?? h.role}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-(--color-text-muted)">
              {h.priceEstimateEUR != null && <span>{formatEUR(h.priceEstimateEUR)} / noche (est.)</span>}
              {h.breakfastIncluded && <span>Desayuno</span>}
              {h.hasParking && <span>Aparcamiento</span>}
              {h.source === "demo" && <span className="rounded-full bg-(--color-optional)/20 px-2 py-0.5">Demo</span>}
            </div>
            {isSelected && <p className="mt-1.5 text-xs font-medium text-(--color-link)">Seleccionado para esta noche</p>}
          </button>
        );
      })}
      <p className="pt-1 text-xs text-(--color-text-muted)">Los precios son estimaciones, no disponibilidad real. Confírmalos antes de reservar.</p>
    </div>
  );
}

function AparcamientoTab({ stop }: { stop: Stop }) {
  if (stop.parkingOptions.length === 0) return <EmptyState message="Sin aparcamientos registrados en esta parada." icon={ParkingCircle} />;
  return (
    <div className="space-y-2">
      {stop.parkingOptions.map((p) => (
        <div key={p.id} className="rounded-xl border p-2.5" style={{ borderColor: "var(--color-border)" }}>
          <p className="font-medium">{p.name}</p>
          {p.walkingDistanceMeters && <p className="text-xs text-(--color-text-muted)">{p.walkingDistanceMeters} m a pie</p>}
          {p.priceInfo && <p className="text-xs text-(--color-text-muted)">{p.priceInfo}</p>}
        </div>
      ))}
    </div>
  );
}

function NotasTab({ stop }: { stop: Stop }) {
  /*
   * Filtrar FUERA del selector, no dentro.
   *
   * `useTripStore((s) => s.notes.filter(...))` devuelve un array nuevo cada
   * vez que se le pregunta, y Zustand compara por identidad: como nunca es el
   * mismo objeto, cree que el estado ha cambiado, vuelve a renderizar, vuelve
   * a filtrar... Abrir esta pestaña tiraba la app entera con "Maximum update
   * depth exceeded", a cuatro toques del mapa.
   *
   * Seleccionando el array tal cual —que sí es el mismo objeto mientras no se
   * toquen las notas— y filtrando en un `useMemo`, no hay identidad nueva que
   * confundir.
   */
  const todasLasNotas = useTripStore((s) => s.notes);
  const notes = useMemo(
    () => todasLasNotas.filter((n) => n.targetType === "stop" && n.targetId === stop.id),
    [todasLasNotas, stop.id],
  );
  const addNote = useTripStore((s) => s.addNote);
  const deleteNote = useTripStore((s) => s.deleteNote);
  const [draft, setDraft] = useState("");

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Añadir una nota..." className="flex-1 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--color-border)" }} />
        <button
          onClick={() => {
            if (!draft.trim()) return;
            addNote({ targetType: "stop", targetId: stop.id, text: draft.trim(), tags: [], favorite: false });
            setDraft("");
          }}
          className="rounded-lg bg-(--color-navigation) px-3 text-sm font-semibold text-white"
        >
          Añadir
        </button>
      </div>
      {notes.map((n) => (
        <div key={n.id} className="flex items-start justify-between gap-2 rounded-xl bg-(--color-surface-muted) p-2.5">
          <p>{n.text}</p>
          <button onClick={() => deleteNote(n.id)} className="text-xs text-(--color-cancelled)">
            Eliminar
          </button>
        </div>
      ))}
    </div>
  );
}

function GastosTab({ stop }: { stop: Stop }) {
  // Mismo caso que en las notas: el filtro va fuera del selector, o cada
  // render fabrica un array nuevo y Zustand entra en bucle.
  const todosLosGastos = useTripStore((s) => s.expenses);
  const expenses = useMemo(() => todosLosGastos.filter((e) => e.stopId === stop.id), [todosLosGastos, stop.id]);
  const addExpense = useTripStore((s) => s.addExpense);
  const [amount, setAmount] = useState("");

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          inputMode="decimal"
          placeholder="Importe €"
          className="w-24 rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: "var(--color-border)" }}
        />
        <button
          onClick={() => {
            const value = Number.parseFloat(amount);
            if (!value || value <= 0) return;
            const now = new Date();
            addExpense({
              date: fechaLocal(now),
              time: now.toTimeString().slice(0, 5),
              amountEUR: value,
              category: "otros",
              place: stop.name,
              dayId: stop.dayId,
              stopId: stop.id,
              paidByTravelerId: null,
              splitBetweenTravelerIds: [],
              paymentMethod: "tarjeta",
              notes: "",
              receiptPhotoId: null,
              kind: "actual",
            });
            setAmount("");
          }}
          className="rounded-lg bg-(--color-navigation) px-3 text-sm font-semibold text-white"
        >
          Registrar gasto
        </button>
      </div>
      {expenses.map((e) => (
        <div key={e.id} className="flex justify-between rounded-xl bg-(--color-surface-muted) p-2.5">
          <span>{e.category}</span>
          <span className="font-semibold">{formatEUR(e.amountEUR)}</span>
        </div>
      ))}
    </div>
  );
}

function LluviaTab({ stop }: { stop: Stop }) {
  if (!stop.rainAlternative) return <EmptyState message="Sin alternativa de lluvia definida para esta parada." icon={CloudRain} />;
  return (
    <div className="flex items-start gap-2 rounded-xl bg-(--color-surface-muted) p-3">
      <CloudRain size={18} className="mt-0.5 shrink-0 text-(--color-link)" aria-hidden="true" />
      <p>{stop.rainAlternative}</p>
    </div>
  );
}

function PracticaTab({ stop }: { stop: Stop }) {
  // Al abrir esta pestaña sí se sale a la red: es donde esos datos se leen.
  const { datos, cargando, error } = usePlaceDetails(stop.coordinates, stop.name, true);

  // Lo que ya venía escrito en la parada manda sobre lo de OpenStreetMap:
  // si lo escribiste tú, sabes más que el mapa.
  const horario = stop.openingHours ?? datos?.horario;

  return (
    <div className="space-y-3">
      {horario && <EstadoApertura horario={horario} />}

      <dl className="space-y-2">
        {/* El horario va apilado y no en dos columnas: las cadenas de
            OpenStreetMap son largas y aplastaban la etiqueta. */}
        <div className="border-b pb-1.5" style={{ borderColor: "var(--color-border)" }}>
          <dt className="text-sm text-(--color-text-muted)">Horario</dt>
          <dd className="mt-0.5 break-words text-sm font-medium">{horario ?? (cargando ? "Consultando…" : "Sin datos")}</dd>
        </div>
        <Row label="Reserva necesaria" value={stop.bookingRequired ? "Sí" : "No"} />
        {datos?.precio && <Row label="Precio" value={datos.precio} />}
        {!datos?.precio && datos?.entradaDePago && <Row label="Entrada" value={datos.entradaDePago === "si" ? "De pago" : "Gratuita"} />}
        {datos?.cocina && <Row label="Cocina" value={datos.cocina} />}
        <Row label="Dificultad" value={stop.walkingDifficulty} />
        <Row label="Accesibilidad" value={stop.accessibility.wheelchairAccessible === "unknown" ? "Sin verificar" : stop.accessibility.wheelchairAccessible ? "Accesible" : "No accesible"} />
        {stop.stadiumInfo && (
          <>
            <Row label="Equipo" value={stop.stadiumInfo.team} />
            <Row label="Visita guiada" value={stop.stadiumInfo.infoPendingVerification ? "Pendiente de comprobar" : stop.stadiumInfo.hasGuidedTour ? "Sí" : "No"} />
          </>
        )}
      </dl>

      {(datos?.telefono || datos?.web || stop.officialUrl) && (
        <div className="flex flex-wrap gap-2">
          {datos?.telefono && (
            <a
              href={`tel:${datos.telefono.replace(/\s/g, "")}`}
              className="flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm text-(--color-link)"
              style={{ borderColor: "var(--color-border)" }}
            >
              <Phone size={15} aria-hidden="true" /> Llamar
            </a>
          )}
          {(datos?.web ?? stop.officialUrl) && (
            <button
              onClick={() => openExternalUrl((datos?.web ?? stop.officialUrl)!)}
              className="flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm text-(--color-link)"
              style={{ borderColor: "var(--color-border)" }}
            >
              <Globe size={15} aria-hidden="true" /> Web oficial
            </button>
          )}
        </div>
      )}

      {error && <p className="text-xs text-(--color-text-muted)">{error}</p>}
      {datos && !datos.encontrado && !horario && (
        <p className="text-xs text-(--color-text-muted)">
          OpenStreetMap no tiene datos de este sitio. Puedes escribirlos tú desde el editor de la parada.
        </p>
      )}
      {datos?.encontrado && <p className="text-[11px] text-(--color-text-muted)">Datos de OpenStreetMap, mantenidos por voluntarios.</p>}
    </div>
  );
}

/** Aviso de abierto o cerrado. Si el horario no se entiende, no dice nada. */
function EstadoApertura({ horario }: { horario: string }) {
  const estado = estadoDeApertura(horario);
  if (estado.estado === "desconocido") return null;

  const abierto = estado.estado === "abierto";
  const cierraPronto = abierto && estado.minutosParaCerrar <= 60;
  const color = !abierto ? "var(--color-cancelled)" : cierraPronto ? "var(--color-gastronomy)" : "var(--color-completed)";

  const texto = abierto
    ? cierraPronto
      ? `Cierra en ${estado.minutosParaCerrar} min`
      : `Abierto ahora · cierra a las ${estado.cierraA}`
    : estado.abreA
      ? `Cerrado · abre ${estado.abreDia} a las ${estado.abreA}`
      : "Cerrado";

  return (
    <p className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
      {texto}
    </p>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-1.5 text-sm" style={{ borderColor: "var(--color-border)" }}>
      <dt className="shrink-0 text-(--color-text-muted)">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium">{value}</dd>
    </div>
  );
}

function EmptyState({ message, icon: Icon = Info }: { message: string; icon?: typeof Info }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-(--color-surface-muted) py-6 text-center text-(--color-text-muted)">
      <Icon size={20} aria-hidden="true" />
      <p className="max-w-[220px] text-xs">{message}</p>
    </div>
  );
}
