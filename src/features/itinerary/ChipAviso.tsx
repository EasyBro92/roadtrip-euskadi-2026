import type { LucideIcon } from "lucide-react";

interface ChipAvisoProps {
  icon: LucideIcon;
  /** El dato, corto: "31° / 16°", "Hostal Valle de Tena", "9 h 57 min". */
  children: React.ReactNode;
  /** Color del icono. Por defecto, el gris del texto secundario. */
  color?: string;
  onClick?: () => void;
  label?: string;
}

/**
 * Un aviso del día cuando no hay nada de qué preocuparse.
 *
 * Los cuatro avisos —duración, tiempo, dónde duermes y horarios— ocupaban una
 * tira gris a lo ancho cada uno, y entre los cuatro se comían 170 px: al abrir
 * el itinerario se veía una parada y media. Casi siempre no dicen nada malo,
 * sólo un dato, y un dato cabe en una pastilla.
 *
 * Cuando sí hay algo que mirar —lluvia, una noche sin hotel, un día que no
 * cabe— cada aviso vuelve a su tira entera con su explicación y sus botones.
 * Callado cuando todo va bien y grande cuando no, que es lo que hace que un
 * aviso se lea cuando aparece.
 */
export function ChipAviso({ icon: Icon, children, color, onClick, label }: ChipAvisoProps) {
  const contenido = (
    <>
      <Icon size={13} className="shrink-0" style={color ? { color } : undefined} aria-hidden="true" />
      <span className="truncate">{children}</span>
    </>
  );

  const clases =
    "control-en-linea flex max-w-full items-center gap-1.5 rounded-full border bg-(--color-surface) px-2.5 py-1 text-xs text-(--color-text)";

  if (!onClick) {
    return (
      <span className={clases} style={{ borderColor: "var(--color-border)" }}>
        {contenido}
      </span>
    );
  }

  return (
    <button onClick={onClick} aria-label={label} className={clases} style={{ borderColor: "var(--color-border)" }}>
      {contenido}
    </button>
  );
}
