import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { logrosDelViaje } from "../data/achievements.data";
import { db } from "../services/storage/db";
import { useTripStore } from "../stores/useTripStore";
import { useUIStore } from "../stores/useUIStore";

const COLORES = ["#1a73e8", "#ea4335", "#fbbc04", "#34a853", "#ec4899", "#a142f4"];

interface Pieza {
  id: number;
  izquierda: number;
  color: string;
  dx: number;
  giro: number;
  retraso: number;
}

function rafagaDeConfeti(): Pieza[] {
  return Array.from({ length: 48 }, (_, id) => ({
    id,
    izquierda: Math.random() * 100,
    color: COLORES[id % COLORES.length],
    dx: (Math.random() - 0.5) * 160,
    giro: 360 + Math.random() * 540,
    retraso: Math.random() * 250,
  }));
}

/**
 * Celebra lo que consigues durante el viaje: confeti y un aviso al acabar
 * todas las paradas de un día o al ganar un logro.
 *
 * Antes los logros sólo se calculaban al abrir su pantalla, así que nadie se
 * enteraba de que había ganado uno. Ahora se revisan solos cada vez que
 * marcas una parada como visitada, haces una foto o repostas.
 */
export function Celebracion() {
  const navigate = useNavigate();
  const stopsById = useTripStore((s) => s.stopsById);
  const days = useTripStore((s) => s.trip.days);
  const tripId = useTripStore((s) => s.trip.id);
  const repostajes = useTripStore((s) => s.refuels.length);
  const nuevos = useTripStore((s) => s.newlyUnlockedAchievementIds);
  const syncAchievements = useTripStore((s) => s.syncAchievements);
  const clearNewlyUnlocked = useTripStore((s) => s.clearNewlyUnlocked);
  const pushToast = useUIStore((s) => s.pushToast);
  const fotos = useLiveQuery(() => db.photos.count(), []);
  const [confeti, setConfeti] = useState<Pieza[] | null>(null);
  // Al abrir la app o cambiar de viaje, lo ya conseguido no se celebra otra vez.
  const viajeRevisado = useRef<string | null>(null);
  const diasAntes = useRef<{ tripId: string; completos: Set<string> } | null>(null);

  const visitadas = useMemo(
    () =>
      Object.values(stopsById)
        .filter((s) => s.visited)
        .map((s) => s.id)
        .sort()
        .join(","),
    [stopsById],
  );

  const diasCompletos = useMemo(() => {
    const completos = new Set<string>();
    for (const d of days) {
      const paradas = d.stopIds.map((id) => stopsById[id]).filter((s) => s?.enabled && !s.optional);
      if (paradas.length > 0 && paradas.every((s) => s.visited)) completos.add(d.id);
    }
    return completos;
  }, [days, stopsById]);

  // Revisar logros cuando cambia algo que puede ganarlos.
  useEffect(() => {
    if (fotos === undefined) return;
    syncAchievements(fotos);
    if (viajeRevisado.current !== tripId) {
      viajeRevisado.current = tripId;
      clearNewlyUnlocked();
    }
  }, [tripId, visitadas, fotos, repostajes, syncAchievements, clearNewlyUnlocked]);

  useEffect(() => {
    if (nuevos.length === 0) return;
    const aplicables = logrosDelViaje(Object.values(useTripStore.getState().stopsById)).filter((d) => nuevos.includes(d.id));
    clearNewlyUnlocked();
    if (aplicables.length === 0) return;
    const nombre = aplicables.length === 1 ? `Logro conseguido: ${aplicables[0].name}` : `${aplicables.length} logros conseguidos`;
    pushToast(nombre, "success", { etiqueta: "Ver", alPulsar: () => navigate("/mas/logros") });
    setConfeti(rafagaDeConfeti());
  }, [nuevos, clearNewlyUnlocked, pushToast, navigate]);

  // Un día que se acaba de completar ahora, no uno que ya lo estaba.
  useEffect(() => {
    const antes = diasAntes.current;
    diasAntes.current = { tripId, completos: diasCompletos };
    if (!antes || antes.tripId !== tripId) return;
    const nuevo = days.findIndex((d) => diasCompletos.has(d.id) && !antes.completos.has(d.id));
    if (nuevo === -1) return;
    pushToast(`¡Día ${nuevo + 1} completado! Todas las paradas visitadas.`, "success");
    setConfeti(rafagaDeConfeti());
  }, [tripId, diasCompletos, days, pushToast]);

  useEffect(() => {
    if (!confeti) return;
    const t = setTimeout(() => setConfeti(null), 2000);
    return () => clearTimeout(t);
  }, [confeti]);

  if (!confeti) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[1300] overflow-hidden" aria-hidden="true">
      {confeti.map((p) => (
        <span
          key={p.id}
          className="confeti-pieza"
          style={
            {
              left: `${p.izquierda}%`,
              background: p.color,
              animationDelay: `${p.retraso}ms`,
              "--dx": `${p.dx}px`,
              "--giro": `${p.giro}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
