import { Clock, TriangleAlert } from "lucide-react";
import { ChipAviso } from "./ChipAviso";
import type { Stop } from "../../types";
import { duracionDelDia } from "./duracionDia";
import { formatearMinutos } from "./tramos";

/**
 * Cuántas horas pide el día, dicho antes de vivirlo.
 *
 * Cuando cabe, es una línea gris que no molesta. Cuando no cabe, dice las
 * horas y por qué no salen: es la diferencia entre enterarte esta noche, con
 * tiempo de quitar dos paradas, y enterarte a las siete de la tarde con media
 * lista por ver.
 */
export function AvisoDuracion({ stops }: { stops: Stop[] }) {
  const { minutosVisitas, minutosCamino, minutosTotales, nivel } = duracionDelDia(stops);

  if (minutosTotales === 0) return null;

  const desglose = `${formatearMinutos(minutosVisitas)} de visitas y ${formatearMinutos(minutosCamino)} de camino`;

  if (nivel === "holgado") {
    return <ChipAviso icon={Clock}>{formatearMinutos(minutosTotales)} de día</ChipAviso>;
  }

  const imposible = nivel === "imposible";

  return (
    <div
      className="flex w-full items-start gap-2 rounded-xl p-2.5 text-xs text-(--color-text)"
      style={{ background: imposible ? "color-mix(in srgb, var(--color-cancelled) 14%, transparent)" : "color-mix(in srgb, var(--color-skipped) 18%, transparent)" }}
    >
      {imposible ? (
        <TriangleAlert size={15} className="mt-0.5 shrink-0 text-(--color-cancelled)" aria-hidden="true" />
      ) : (
        <Clock size={15} className="mt-0.5 shrink-0 text-(--color-skipped)" aria-hidden="true" />
      )}
      <p>
        Unas <strong>{formatearMinutos(minutosTotales)}</strong> de día: {desglose}.{" "}
        {imposible
          ? "Sin contar comidas, colas ni buscar aparcamiento, así que no cabe. Quita o marca como opcionales las paradas que menos te importen."
          : "Sales pronto y llegas de noche."}
      </p>
    </div>
  );
}
