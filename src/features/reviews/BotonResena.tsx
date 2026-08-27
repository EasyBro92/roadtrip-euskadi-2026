import { PenLine } from "lucide-react";
import { useRatingsStore, type TipoValorado } from "../../stores/useRatingsStore";
import { useUIStore } from "../../stores/useUIStore";

/**
 * Abre la reseña de un sitio o una ruta, y de paso enseña lo que ya escribiste.
 *
 * Va debajo de las estrellas a propósito: puntuar es un toque y escribir es
 * sentarse un rato, así que lo rápido queda delante y esto no estorba.
 */
export function BotonResena({ tipo, targetId, nombre }: { tipo: TipoValorado; targetId: string; nombre: string }) {
  const valoracion = useRatingsStore((s) => s.valoraciones[`${tipo}:${targetId}`]);
  const openModal = useUIStore((s) => s.openModal);

  const tieneResena = Boolean(valoracion?.comentario || valoracion?.consejo || valoracion?.fotos?.length);

  return (
    <div className="mt-2">
      {tieneResena && valoracion?.comentario && (
        <p className="mb-1.5 line-clamp-3 text-sm text-(--color-text)">{valoracion.comentario}</p>
      )}
      <button
        onClick={() => openModal({ type: "review", tipo, targetId, nombre })}
        className="flex items-center gap-1.5 text-sm font-medium text-(--color-link)"
      >
        <PenLine size={14} aria-hidden="true" />
        {tieneResena ? "Editar tu reseña" : "Escribir una reseña"}
      </button>
    </div>
  );
}
