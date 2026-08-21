import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

/** Tarjeta de estadística compacta, al estilo de los datos de una ficha de Google Maps. */
export function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-(--radius-card) border bg-(--color-surface) px-2 py-3 text-center shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-(--color-navigation)/10">
        <Icon size={16} className="text-(--color-navigation)" aria-hidden="true" />
      </span>
      <span className="w-full truncate text-sm font-medium text-(--color-text)">{value}</span>
      <span className="w-full truncate text-[11px] text-(--color-text-muted)">{label}</span>
    </div>
  );
}
