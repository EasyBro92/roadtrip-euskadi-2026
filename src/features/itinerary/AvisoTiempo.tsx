import { CloudRain, Sun, Umbrella } from "lucide-react";
import { useEffect, useState } from "react";
import {
  LLUVIA_PREOCUPANTE_PCT,
  WeatherService,
  describirTiempo,
  hayPrevisionPara,
  type PrevisionDia,
} from "../../services/weather/WeatherService";
import type { ISODate, Stop } from "../../types";

/** Categorías que se pueden ver aunque diluvie. */
const BAJO_TECHO = new Set(["cultura", "gastronomia", "historia", "castillo"]);

/**
 * El tiempo previsto para el día, y qué hacer si va a llover.
 *
 * Sólo aparece si el día entra en la ventana de previsión. Un viaje a un mes
 * vista no tiene pronóstico y decir uno sería inventárselo.
 */
export function AvisoTiempo({ fecha, stops }: { fecha: ISODate; stops: Stop[] }) {
  const [dia, setDia] = useState<PrevisionDia | null>(null);

  // Se pide sobre la primera parada del día: la previsión de una ciudad vale
  // para todo lo que hagas en ella, y así es una consulta y no diez.
  const referencia = stops[0]?.coordinates;
  const lat = referencia?.latitude;
  const lon = referencia?.longitude;

  useEffect(() => {
    if (lat == null || lon == null || !hayPrevisionPara(fecha)) {
      setDia(null);
      return;
    }
    let vigente = true;
    WeatherService.prevision({ latitude: lat, longitude: lon })
      .then((dias) => {
        if (vigente) setDia(dias.find((d) => d.fecha === fecha) ?? null);
      })
      // Sin previsión no se dice nada; un error del tiempo no debe gritar.
      .catch(() => setDia(null));
    return () => {
      vigente = false;
    };
  }, [lat, lon, fecha]);

  if (!dia) return null;

  const { texto, lluvia } = describirTiempo(dia.codigo);
  const preocupa = lluvia || dia.lluviaPct >= LLUVIA_PREOCUPANTE_PCT;

  const refugios = preocupa ? stops.filter((s) => s.enabled && (BAJO_TECHO.has(s.category) || s.rainAlternative)).slice(0, 3) : [];

  const Icono = preocupa ? CloudRain : Sun;

  return (
    <div className="mt-2 flex items-start gap-2 rounded-xl bg-(--color-surface-muted) p-2.5 text-xs text-(--color-text)">
      <Icono size={15} className={`mt-0.5 shrink-0 ${preocupa ? "text-(--color-link)" : "text-(--color-skipped)"}`} aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1">
        <p>
          <span className="font-medium">{texto}</span> · {dia.maxC}° / {dia.minC}°
          {dia.lluviaPct > 0 && <span className="text-(--color-text-muted)"> · {dia.lluviaPct}% de lluvia</span>}
        </p>

        {preocupa && refugios.length > 0 && (
          <p className="flex items-start gap-1 text-(--color-text-muted)">
            <Umbrella size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>Bajo techo ese día: {refugios.map((s) => s.name).join(", ")}.</span>
          </p>
        )}
        {preocupa && refugios.length === 0 && (
          <p className="text-(--color-text-muted)">Todo lo de este día es al aire libre. Quizá convenga un plan B.</p>
        )}
      </div>
    </div>
  );
}
