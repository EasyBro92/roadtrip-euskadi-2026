import { CalendarDays, MapPin, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SharingService } from "../services/sharing/SharingService";
import type { ItinerarioLeido } from "../services/sharing/enlaceItinerario";
import { useTripStore } from "../stores/useTripStore";
import { useUIStore } from "../stores/useUIStore";
import { formatDateLong } from "../utils/format";

/**
 * Un itinerario que llega en un enlace.
 *
 * Nunca se importa solo: se enseña qué trae y tú decides. Un enlace lo puede
 * mandar cualquiera, y crear un viaje sin preguntar sería dejar que alguien
 * de fuera te cambie la app de sitio.
 */
export function ImportarPage() {
  const navigate = useNavigate();
  const createTrip = useTripStore((s) => s.createTrip);
  const addStop = useTripStore((s) => s.addStop);
  const pushToast = useUIStore((s) => s.pushToast);

  const [itinerario, setItinerario] = useState<ItinerarioLeido | null>(null);
  const [estado, setEstado] = useState<"leyendo" | "listo" | "roto">("leyendo");

  useEffect(() => {
    // Los datos van tras la almohadilla, así que no están en `search`. Se
    // acepta también `?i=` por si alguien pega el enlace a mano.
    const codificado =
      new URLSearchParams(window.location.hash.replace(/^#/, "")).get("i") ??
      new URLSearchParams(window.location.search).get("i");
    if (!codificado) {
      setEstado("roto");
      return;
    }
    SharingService.leerEnlace(codificado).then((leido) => {
      setItinerario(leido);
      setEstado(leido ? "listo" : "roto");
    });
  }, []);

  function importar() {
    if (!itinerario) return;
    createTrip({ name: itinerario.nombre, startDate: itinerario.fechaInicio, dayCount: itinerario.dias });

    const dias = useTripStore.getState().trip.days;
    for (const p of itinerario.paradas) {
      const dia = dias[p.dia - 1];
      if (!dia) continue;
      addStop(dia.id, {
        name: p.nombre,
        category: p.categoria,
        coordinates: { latitude: p.latitude, longitude: p.longitude },
        recommendedDurationMinutes: p.minutos,
      });
    }

    pushToast(`"${itinerario.nombre}" añadido a tus viajes.`, "success");
    navigate("/viaje");
  }

  return (
    <div className="safe-x min-h-dvh bg-(--color-bg) px-4 pb-10 pt-[calc(env(safe-area-inset-top)+24px)]">
      <h1 className="text-xl font-bold">Itinerario compartido</h1>

      {estado === "leyendo" && <p className="mt-3 text-sm text-(--color-text-muted)">Leyendo el enlace…</p>}

      {estado === "roto" && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-(--color-surface-muted) p-3 text-sm text-(--color-text)">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-(--color-skipped)" aria-hidden="true" />
          <p>
            Este enlace no se entiende. Puede que se haya cortado al enviarlo: los enlaces largos se rompen en algunas aplicaciones de mensajería. Pide que te lo manden
            como fichero.
          </p>
        </div>
      )}

      {estado === "listo" && itinerario && (
        <>
          <p className="mt-1 text-sm text-(--color-text-muted)">Esto es lo que trae el enlace. No se añade nada hasta que lo digas.</p>

          <div className="mt-4 rounded-(--radius-card) border bg-(--color-surface) p-4" style={{ borderColor: "var(--color-border)" }}>
            <p className="text-base font-semibold text-(--color-text)">{itinerario.nombre}</p>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-(--color-text-muted)">
              <span className="flex items-center gap-1.5">
                <CalendarDays size={13} aria-hidden="true" /> {formatDateLong(itinerario.fechaInicio)} · {itinerario.dias} días
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin size={13} aria-hidden="true" /> {itinerario.paradas.length} paradas
              </span>
            </div>
          </div>

          {Array.from({ length: itinerario.dias }, (_, i) => i + 1).map((dia) => {
            const delDia = itinerario.paradas.filter((p) => p.dia === dia);
            if (delDia.length === 0) return null;
            return (
              <div key={dia} className="mt-3">
                <p className="text-xs font-semibold uppercase text-(--color-text-muted)">Día {dia}</p>
                <ul className="mt-1">
                  {delDia.map((p, i) => (
                    <li key={`${p.nombre}-${i}`} className="truncate py-1 text-sm text-(--color-text)">
                      {p.nombre}
                      <span className="text-(--color-text-muted)"> · {p.minutos} min</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          <p className="mt-4 text-xs text-(--color-text-muted)">
            Trae sólo el plan: paradas, días y duraciones. Sin fotos, notas, gastos ni valoraciones — eso se queda siempre en el móvil de quien lo compartió.
          </p>

          <div className="mt-4 flex gap-2">
            <button onClick={() => navigate("/viajes")} className="flex-1 rounded-full border py-3 text-sm font-medium" style={{ borderColor: "var(--color-border)" }}>
              No, gracias
            </button>
            <button onClick={importar} className="flex-1 rounded-full bg-(--color-navigation) py-3 text-sm font-semibold text-white">
              Añadir a mis viajes
            </button>
          </div>
        </>
      )}
    </div>
  );
}
