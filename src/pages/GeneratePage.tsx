import { ArrowLeft, Loader2, Plus, Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ItineraryGeneratorService, type Interes, type Ritmo, type SugerenciaParada, type Transporte } from "../services/generator/ItineraryGeneratorService";
import { useTripStore } from "../stores/useTripStore";
import { useUIStore } from "../stores/useUIStore";
import { shiftISODate, toISODate } from "../utils/dates";
import { formatDateLong } from "../utils/format";

const INTERESES: { id: Interes; label: string }[] = [
  { id: "cultura", label: "Museos y cultura" },
  { id: "monumentos", label: "Monumentos" },
  { id: "gastronomia", label: "Gastronomía" },
  { id: "naturaleza", label: "Naturaleza" },
  { id: "playa", label: "Playa" },
  { id: "ocio", label: "Miradores y ocio" },
];

const RITMOS: { id: Ritmo; label: string }[] = [
  { id: "tranquilo", label: "Tranquilo" },
  { id: "normal", label: "Normal" },
  { id: "intenso", label: "Intenso" },
];

const TRANSPORTES: { id: Transporte; label: string }[] = [
  { id: "pie", label: "A pie" },
  { id: "publico", label: "Transporte público" },
  { id: "coche", label: "En coche" },
];

function Grupo<T extends string>({ titulo, opciones, valor, onChange }: { titulo: string; opciones: { id: T; label: string }[]; valor: T; onChange: (v: T) => void }) {
  return (
    <div className="mt-4">
      <p className="mb-1.5 text-xs font-medium text-(--color-text-muted)">{titulo}</p>
      <div className="flex flex-wrap gap-2">
        {opciones.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            aria-pressed={valor === o.id}
            className={`rounded-full border px-3.5 py-2 text-sm ${valor === o.id ? "border-(--color-navigation) bg-(--color-navigation) font-medium text-white" : "bg-(--color-surface) text-(--color-text)"}`}
            style={valor !== o.id ? { borderColor: "var(--color-border)" } : undefined}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Genera un itinerario para cualquier destino a partir de datos abiertos.
 *
 * Muestra el resultado antes de crear nada: es una propuesta para retocar, no
 * una guía, y conviene verla antes de que se convierta en un viaje.
 */
export function GeneratePage() {
  const navigate = useNavigate();
  const createTrip = useTripStore((s) => s.createTrip);
  const addStop = useTripStore((s) => s.addStop);
  const pushToast = useUIStore((s) => s.pushToast);

  const [destino, setDestino] = useState("");
  const [dias, setDias] = useState(3);
  const [intereses, setIntereses] = useState<Interes[]>(["cultura", "gastronomia"]);
  const [ritmo, setRitmo] = useState<Ritmo>("normal");
  const [fechaInicio, setFechaInicio] = useState(toISODate(new Date()));
  const [presupuesto, setPresupuesto] = useState("");
  const [transporte, setTransporte] = useState<Transporte>("pie");

  const [generando, setGenerando] = useState(false);
  const [propuesta, setPropuesta] = useState<SugerenciaParada[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function alternarInteres(id: Interes) {
    setIntereses((previos) => (previos.includes(id) ? previos.filter((i) => i !== id) : [...previos, id]));
  }

  async function generar() {
    if (destino.trim().length < 3) {
      pushToast("Escribe a dónde quieres ir.", "error");
      return;
    }
    setGenerando(true);
    setError(null);
    setPropuesta(null);
    try {
      const { paradas } = await ItineraryGeneratorService.generate({ destino, dias, intereses, ritmo, transporte });
      if (paradas.length === 0) {
        setError(`No he encontrado sitios en "${destino}" con esos filtros. Prueba con más intereses o en coche.`);
      } else {
        setPropuesta(paradas);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerando(false);
    }
  }

  function aceptar() {
    if (!propuesta) return;
    // La fecha importa de verdad: con ella el itinerario ya sabe avisar de
    // lo que estará cerrado y de qué tiempo hará cada día.
    const importe = Number(presupuesto.replace(",", "."));
    createTrip({
      name: destino.trim(),
      startDate: fechaInicio || toISODate(new Date()),
      dayCount: dias,
      budgetEUR: Number.isFinite(importe) && importe > 0 ? importe : 0,
    });

    const diasDelViaje = useTripStore.getState().trip.days;
    for (const sugerencia of propuesta) {
      const dia = diasDelViaje[sugerencia.dayIndex - 1];
      if (!dia) continue;
      addStop(dia.id, {
        name: sugerencia.name,
        category: sugerencia.category,
        coordinates: sugerencia.coordinates,
        recommendedDurationMinutes: sugerencia.recommendedDurationMinutes,
      });
    }

    pushToast(`Viaje a ${destino.trim()} creado. Edítalo a tu gusto.`, "success");
    navigate("/viaje");
  }

  const porDia = new Map<number, SugerenciaParada[]>();
  for (const p of propuesta ?? []) porDia.set(p.dayIndex, [...(porDia.get(p.dayIndex) ?? []), p]);

  return (
    <div className="safe-x min-h-dvh bg-(--color-bg) pb-10 pt-[calc(env(safe-area-inset-top)+20px)]">
      <header className="mb-2 flex items-center gap-2">
        <button onClick={() => navigate("/viajes")} aria-label="Volver a mis viajes" className="-ml-2 p-2">
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <h1 className="text-2xl font-semibold text-(--color-text)">Proponme un viaje</h1>
      </header>
      <p className="mb-4 text-sm text-(--color-text-muted)">
        Dime a dónde vas y te propongo un itinerario para retocar.
      </p>

      <div className="rounded-(--radius-card) border bg-(--color-surface) p-4 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
        <label className="block text-xs font-medium text-(--color-text-muted)">
          ¿A dónde vas?
          <input
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generar()}
            placeholder="Madrid, Lisboa, Roma…"
            className="mt-1 w-full rounded-(--radius-control) border bg-(--color-bg) px-3 py-2.5 text-base text-(--color-text)"
            style={{ borderColor: "var(--color-border)" }}
          />
        </label>

        <label className="mt-3 block text-xs font-medium text-(--color-text-muted)">
          ¿Cuántos días?
          <input
            type="number"
            min={1}
            max={14}
            value={dias}
            onChange={(e) => setDias(Math.max(1, Math.min(14, Number(e.target.value))))}
            className="mt-1 w-24 rounded-(--radius-control) border bg-(--color-bg) px-3 py-2.5 text-base text-(--color-text)"
            style={{ borderColor: "var(--color-border)" }}
          />
        </label>

        <div className="mt-3 flex flex-wrap gap-3">
          <label className="block text-xs font-medium text-(--color-text-muted)">
            ¿Cuándo empiezas?
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="mt-1 block rounded-(--radius-control) border bg-(--color-bg) px-3 py-2.5 text-base text-(--color-text)"
              style={{ borderColor: "var(--color-border)" }}
            />
          </label>

          <label className="block text-xs font-medium text-(--color-text-muted)">
            Presupuesto (opcional)
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={presupuesto}
              onChange={(e) => setPresupuesto(e.target.value)}
              placeholder="€"
              className="mt-1 block w-28 rounded-(--radius-control) border bg-(--color-bg) px-3 py-2.5 text-base text-(--color-text)"
              style={{ borderColor: "var(--color-border)" }}
            />
          </label>
        </div>

        <div className="mt-4">
          <p className="mb-1.5 text-xs font-medium text-(--color-text-muted)">¿Qué te interesa?</p>
          <div className="flex flex-wrap gap-2">
            {INTERESES.map((i) => {
              const activo = intereses.includes(i.id);
              return (
                <button
                  key={i.id}
                  onClick={() => alternarInteres(i.id)}
                  aria-pressed={activo}
                  className={`rounded-full border px-3.5 py-2 text-sm ${activo ? "border-(--color-navigation) bg-(--color-navigation) font-medium text-white" : "bg-(--color-surface) text-(--color-text)"}`}
                  style={!activo ? { borderColor: "var(--color-border)" } : undefined}
                >
                  {i.label}
                </button>
              );
            })}
          </div>
        </div>

        <Grupo titulo="¿A qué ritmo?" opciones={RITMOS} valor={ritmo} onChange={setRitmo} />
        <Grupo titulo="¿Cómo te mueves?" opciones={TRANSPORTES} valor={transporte} onChange={setTransporte} />

        <button
          onClick={generar}
          disabled={generando}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-(--color-navigation) py-3.5 text-sm font-medium text-white transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {generando ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Wand2 size={18} aria-hidden="true" />}
          {generando ? "Buscando sitios…" : "Proponme un itinerario"}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-(--radius-card) border bg-(--color-surface) p-4 text-sm text-(--color-text-muted)" style={{ borderColor: "var(--color-border)" }}>
          {error}
        </p>
      )}

      {propuesta && (
        <div className="mt-4 rounded-(--radius-card) border bg-(--color-surface) p-4 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-(--color-navigation)" aria-hidden="true" />
            <h2 className="text-sm font-semibold">{propuesta.length} sitios en {porDia.size} días</h2>
          </div>

          {[...porDia.entries()].sort((a, b) => a[0] - b[0]).map(([dia, paradas]) => (
            <div key={dia} className="mt-3">
              {/* El día de la semana no es adorno: es lo que decide si un
                  museo abre. Verlo aquí evita montar un lunes de cierres. */}
              <p className="text-xs font-semibold uppercase text-(--color-text-muted)">
                Día {dia} · <span className="font-normal normal-case">{formatDateLong(shiftISODate(fechaInicio, dia - 1))}</span>
              </p>
              <ul className="mt-1">
                {paradas.map((p) => (
                  <li key={p.name} className="py-1 text-sm text-(--color-text)">
                    {p.name}
                    <span className="text-(--color-text-muted)"> · {p.recommendedDurationMinutes} min</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <p className="mt-3 text-[11px] leading-relaxed text-(--color-text-muted)">
            Sale de OpenStreetMap y Wikipedia, ordenado por lo conocido que es cada sitio. Es un punto de partida:
            quita, añade y reordena a tu gusto.
          </p>

          <button
            onClick={aceptar}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-(--color-navigation) py-3 text-sm font-medium text-white"
          >
            <Plus size={17} aria-hidden="true" /> Crear este viaje
          </button>
        </div>
      )}
    </div>
  );
}
