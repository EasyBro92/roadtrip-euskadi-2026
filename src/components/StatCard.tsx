import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  /** Pantalla de la que sale el dato. Si se indica, la tarjeta lleva hasta allí. */
  to?: string;
}

const CARD_CLASS =
  "flex flex-col items-center gap-1 rounded-(--radius-card) border bg-(--color-surface) px-2 py-3 text-center shadow-(--shadow-card)";

/** Tarjeta de estadística compacta, al estilo de los datos de una ficha de Google Maps. */
export function StatCard({ icon: Icon, label, value, to }: StatCardProps) {
  const contenido = (
    <>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-(--color-navigation)/10">
        <Icon size={16} className="text-(--color-navigation)" aria-hidden="true" />
      </span>
      <span className="w-full truncate text-sm font-medium text-(--color-text)">{value}</span>
      <span className="w-full truncate text-[11px] text-(--color-text-muted)">{label}</span>
    </>
  );

  // Sin destino se queda como estaba: un bloque informativo, no interactivo.
  if (!to) {
    return (
      <div className={CARD_CLASS} style={{ borderColor: "var(--color-border)" }}>
        {contenido}
      </div>
    );
  }

  return (
    <Link
      to={to}
      aria-label={`${label}: ${value}. Ver detalle`}
      className={`${CARD_CLASS} touch-manipulation transition-transform active:scale-[0.97]`}
      style={{ borderColor: "var(--color-border)" }}
    >
      {contenido}
    </Link>
  );
}
