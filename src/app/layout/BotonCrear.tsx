import { BookOpen, Camera, MapPinPlus, Plus, Receipt } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { pedirGastoRapido } from "../../features/expenses/gastoRapido";
import { useAnadirFotos } from "../../hooks/useAnadirFotos";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";

/**
 * El botón + de abajo a la derecha, como el de Gmail o Google Fotos.
 *
 * Lo que más se hace durante un viaje —apuntar un gasto, añadir una parada,
 * hacer una foto, escribir en el diario— estaba cada cosa en su pestaña y a
 * dos o tres toques. Desde aquí está a uno, estés donde estés.
 */
export function BotonCrear() {
  const [abierto, setAbierto] = useState(false);
  const navigate = useNavigate();
  const openModal = useUIStore((s) => s.openModal);
  const dayId = useTripStore((s) => s.trip.currentDayId ?? s.trip.days[0]?.id ?? null);
  const stopId = useTripStore((s) => s.trip.currentStopId);
  const fotos = useAnadirFotos({ stopId: stopId ?? null, dayId });

  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [abierto]);

  const acciones = [
    { id: "gasto", etiqueta: "Gasto", icono: Receipt, hacer: () => pedirGastoRapido() },
    { id: "parada", etiqueta: "Parada", icono: MapPinPlus, hacer: () => dayId && openModal({ type: "place-library", dayId }) },
    { id: "foto", etiqueta: "Foto", icono: Camera, hacer: () => fotos.abrir() },
    { id: "diario", etiqueta: "Diario", icono: BookOpen, hacer: () => navigate("/diario") },
  ];

  return (
    <>
      {fotos.input}
      {abierto && <div className="fixed inset-0 z-[900] bg-black/30" style={{ animation: "aparece 0.15s ease-out" }} onClick={() => setAbierto(false)} aria-hidden="true" />}
      <div className="pointer-events-none absolute bottom-4 right-4 z-[901] flex flex-col items-end gap-3">
        {abierto &&
          acciones.map((a, i) => (
            <button
              key={a.id}
              onClick={() => {
                setAbierto(false);
                a.hacer();
              }}
              className="aparece pointer-events-auto flex items-center gap-3"
              // De abajo arriba: la más cercana al dedo sale primero.
              style={{ animationDelay: `${(acciones.length - 1 - i) * 35}ms`, animationFillMode: "both" }}
            >
              <span className="rounded-full bg-(--color-surface) px-3 py-1.5 text-sm font-medium text-(--color-text) shadow-(--shadow-card)">{a.etiqueta}</span>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-(--color-surface) text-(--color-link) shadow-(--shadow-card)">
                <a.icono size={20} aria-hidden="true" />
              </span>
            </button>
          ))}
        <button
          aria-label={abierto ? "Cerrar" : "Crear: gasto, parada, foto o diario"}
          aria-expanded={abierto}
          onClick={() => setAbierto((v) => !v)}
          disabled={fotos.subiendo}
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-(--color-navigation) text-white shadow-(--shadow-sheet)"
        >
          <Plus size={26} aria-hidden="true" className="transition-transform duration-200" style={{ transform: abierto ? "rotate(45deg)" : "none" }} />
        </button>
      </div>
    </>
  );
}
