import { Star } from "lucide-react";
import { useRatingsStore, type Estrellas, type TipoValorado } from "../stores/useRatingsStore";
import { useUIStore } from "../stores/useUIStore";

const ESTRELLAS: Estrellas[] = [1, 2, 3, 4, 5];

interface StarRatingInputProps {
  tipo: TipoValorado;
  targetId: string;
  /** Para el aviso y la lectura en voz alta: "Has puntuado el Prado". */
  nombre: string;
  size?: number;
  /** "Tu nota" al lado de las estrellas. Se apaga donde no cabe, como el panel minimizado. */
  etiqueta?: boolean;
}

/**
 * Puntuación propia de un sitio o de una ruta: cinco estrellas que se tocan.
 *
 * Volver a tocar la estrella ya marcada quita la puntuación, que es la forma
 * de arrepentirse sin buscar un botón aparte.
 */
export function StarRatingInput({ tipo, targetId, nombre, size = 22, etiqueta = true }: StarRatingInputProps) {
  const valoracion = useRatingsStore((s) => s.valoraciones[`${tipo}:${targetId}`]);
  const valorar = useRatingsStore((s) => s.valorar);
  const quitar = useRatingsStore((s) => s.quitarValoracion);
  const pushToast = useUIStore((s) => s.pushToast);

  const actual = valoracion?.estrellas ?? 0;

  function pulsar(n: Estrellas) {
    if (actual === n) {
      quitar(tipo, targetId);
      pushToast(`Puntuación quitada de ${nombre}.`, "info");
      return;
    }
    valorar(tipo, targetId, n);
    pushToast(`${nombre}: ${n} ${n === 1 ? "estrella" : "estrellas"}.`, "success");
  }

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label={`Tu puntuación de ${nombre}`}>
      {ESTRELLAS.map((n) => {
        const marcada = n <= actual;
        return (
          <button
            key={n}
            onClick={() => pulsar(n)}
            aria-label={`${n} de 5 estrellas`}
            aria-pressed={marcada}
            className="touch-manipulation p-0.5 transition-transform active:scale-90"
          >
            <Star
              size={size}
              aria-hidden="true"
              className={marcada ? "text-(--color-gastronomy)" : "text-(--color-border)"}
              fill={marcada ? "currentColor" : "none"}
            />
          </button>
        );
      })}
      {etiqueta && actual > 0 && <span className="ml-1.5 text-xs text-(--color-text-muted)">Tu nota</span>}
    </div>
  );
}
