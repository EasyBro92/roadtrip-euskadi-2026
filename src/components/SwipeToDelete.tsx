import { Trash2 } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

const ANCHO_BOTON = 92;
/** Movimiento mínimo antes de decidir si el gesto es horizontal o vertical. */
const UMBRAL_GESTO = 8;

interface SwipeToDeleteProps {
  onDelete: () => void;
  /** Se lee en voz alta: describe qué se borra, no solo "borrar". */
  deleteLabel: string;
  /**
   * El redondeo, que tiene que ser el mismo que el de lo que va dentro.
   *
   * Este envoltorio recorta, y el botón rojo de borrar vive debajo. Si él
   * redondea menos que su contenido, por la diferencia entre las dos curvas
   * asoma un hilo rojo en cada esquina, con la fila cerrada y sin tocar nada.
   * Pasaba en las tarjetas de viaje, que redondean a 22 px contra los 12 de
   * aquí.
   */
  radio?: string;
  children: ReactNode;
}

/**
 * Fila deslizable al estilo de iOS y Android: arrastrando hacia la izquierda
 * aparece el botón de borrar, y hay que pulsarlo para que borre. Deslizar no
 * borra por sí solo — un roce al hacer scroll no debe cargarse un gasto.
 *
 * El botón existe siempre en el DOM aunque esté oculto tras la fila, así que
 * también se alcanza con teclado o lector de pantalla, sin gesto.
 */
export function SwipeToDelete({ onDelete, deleteLabel, radio = "rounded-xl", children }: SwipeToDeleteProps) {
  const [desplazamiento, setDesplazamiento] = useState(0);
  const inicio = useRef<{ x: number; y: number } | null>(null);
  const direccion = useRef<"indecisa" | "horizontal" | "vertical">("indecisa");

  function alPulsar(e: React.PointerEvent) {
    inicio.current = { x: e.clientX, y: e.clientY };
    direccion.current = "indecisa";
  }

  function alMover(e: React.PointerEvent) {
    if (!inicio.current) return;
    const dx = e.clientX - inicio.current.x;
    const dy = e.clientY - inicio.current.y;

    // Hasta que el dedo no se mueve lo suficiente no decidimos: si arrancamos
    // a la primera, un scroll vertical desplazaría las filas de lado.
    if (direccion.current === "indecisa") {
      if (Math.abs(dx) < UMBRAL_GESTO && Math.abs(dy) < UMBRAL_GESTO) return;
      direccion.current = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
    }
    if (direccion.current !== "horizontal") return;

    const base = desplazamiento <= -ANCHO_BOTON ? -ANCHO_BOTON : 0;
    setDesplazamiento(Math.max(-ANCHO_BOTON, Math.min(0, base + dx)));
  }

  function alSoltar() {
    if (direccion.current === "horizontal") {
      // Se queda abierta o cerrada del todo, nunca a medias.
      setDesplazamiento(desplazamiento < -ANCHO_BOTON / 2 ? -ANCHO_BOTON : 0);
    }
    inicio.current = null;
    direccion.current = "indecisa";
  }

  const abierta = desplazamiento <= -ANCHO_BOTON / 2;

  return (
    <div className={`relative overflow-hidden ${radio}`}>
      <div className="absolute inset-y-0 right-0 flex">
        <button
          onClick={() => {
            setDesplazamiento(0);
            onDelete();
          }}
          aria-label={deleteLabel}
          tabIndex={abierta ? 0 : -1}
          className="flex w-[92px] items-center justify-center gap-1 bg-(--color-cancelled) text-xs font-medium text-white"
        >
          <Trash2 size={15} aria-hidden="true" /> Borrar
        </button>
      </div>

      <div
        onPointerDown={alPulsar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        style={{ transform: `translateX(${desplazamiento}px)`, touchAction: "pan-y" }}
        className={inicio.current ? "" : "transition-transform duration-200 ease-out"}
      >
        {children}
      </div>
    </div>
  );
}
