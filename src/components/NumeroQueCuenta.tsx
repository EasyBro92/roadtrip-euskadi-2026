import { useEffect, useState } from "react";

const DURACION_MS = 700;

function prefiereSinMovimiento(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Un número que sube desde cero hasta su valor al aparecer, como los totales
 * del resumen anual de Google Maps o de Strava. Admite texto alrededor
 * ("1.234 km", "12 días"): sólo se anima la primera cifra que encuentre.
 *
 * Con "reducir movimiento" activado en el sistema sale el número final directamente.
 */
export function NumeroQueCuenta({ texto }: { texto: string }) {
  // "1.234" es mil doscientos treinta y cuatro (punto de miles); "12.5" no se toca más allá del 12.
  const coincidencia = /\d{1,3}(?:\.\d{3})+(?!\d)|\d+/.exec(texto);
  const objetivo = coincidencia ? Number(coincidencia[0].replace(/\./g, "")) : NaN;
  const animable = Number.isFinite(objetivo) && objetivo > 0;
  const [actual, setActual] = useState(() => (animable && !prefiereSinMovimiento() ? 0 : objetivo));

  useEffect(() => {
    if (!animable || prefiereSinMovimiento()) return;
    let marco = 0;
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - inicio) / DURACION_MS);
      // Frena al final: los últimos números se ven pasar más despacio.
      const suavizado = 1 - Math.pow(1 - t, 3);
      setActual(Math.round(objetivo * suavizado));
      if (t < 1) marco = requestAnimationFrame(paso);
    };
    marco = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(marco);
  }, [animable, objetivo]);

  if (!coincidencia || !animable) return <>{texto}</>;
  const antes = texto.slice(0, coincidencia.index);
  const despues = texto.slice(coincidencia.index + coincidencia[0].length);
  // Para lectores de pantalla, siempre el valor final: oír la cuenta no ayuda.
  return (
    <>
      <span className="sr-only">{texto}</span>
      <span aria-hidden="true">
        {antes}
        {actual.toLocaleString("es-ES")}
        {despues}
      </span>
    </>
  );
}
