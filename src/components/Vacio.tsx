import type { LucideIcon } from "lucide-react";

interface VacioProps {
  icon: LucideIcon;
  /** Una línea que diga qué falta, no un error. */
  titulo: string;
  /** Cómo se llena esto, si no es obvio. */
  texto?: string;
  accion?: { etiqueta: string; onClick: () => void };
}

/**
 * Lo que se ve cuando todavía no hay nada.
 *
 * Un párrafo gris suelto en mitad de una pantalla en blanco parece que algo
 * ha fallado al cargar. Con un icono, aire alrededor y el texto centrado se
 * lee como lo que es — una lista que aún no se ha llenado — y cuando hay una
 * forma clara de llenarla, va aquí mismo en un botón en vez de dejar al que
 * lee buscándola por la app.
 */
export function Vacio({ icon: Icon, titulo, texto, accion }: VacioProps) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-(--color-surface-muted)">
        <Icon size={24} className="text-(--color-text-muted)" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-(--color-text)">{titulo}</p>
      {texto && <p className="mt-1 max-w-xs text-xs leading-relaxed text-(--color-text-muted)">{texto}</p>}
      {accion && (
        <button
          onClick={accion.onClick}
          className="mt-3.5 rounded-full bg-(--color-navigation) px-4 py-2 text-xs font-semibold text-white transition-transform active:scale-95"
        >
          {accion.etiqueta}
        </button>
      )}
    </div>
  );
}
