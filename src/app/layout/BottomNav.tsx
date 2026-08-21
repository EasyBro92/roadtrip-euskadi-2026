import { BookOpen, Map, MoreHorizontal, Route, Wallet } from "lucide-react";
import { NavLink } from "react-router-dom";
import clsx from "clsx";

const ITEMS = [
  { to: "/mapa", label: "Mapa", icon: Map },
  { to: "/itinerario", label: "Itinerario", icon: Route },
  { to: "/diario", label: "Diario", icon: BookOpen },
  { to: "/gastos", label: "Gastos", icon: Wallet },
  { to: "/mas", label: "Más", icon: MoreHorizontal },
];

/**
 * Barra inferior fija (sección 16). Estilo Material 3 / Google Maps: el
 * destino activo lleva una "píldora" de fondo tras el icono en vez de
 * limitarse a cambiar de color. Objetivo táctil >= 44px, accesible con una mano.
 */
export function BottomNav() {
  return (
    <nav
      aria-label="Navegación principal"
      className="safe-bottom safe-x flex shrink-0 items-stretch justify-around border-t bg-(--color-surface)"
      // La barra ocupa todo el ancho a propósito: solo necesita el recorte
      // real del dispositivo, no el margen de lectura de las páginas.
      style={{ borderColor: "var(--color-border)", "--safe-x-min": "0px" } as React.CSSProperties}
    >
      {ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className="flex flex-1 flex-col items-center justify-center gap-1 py-2">
          {({ isActive }) => (
            <>
              <span
                className={clsx(
                  "flex h-8 w-16 items-center justify-center rounded-full transition-colors",
                  isActive ? "bg-(--color-navigation)/12" : "bg-transparent",
                )}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.4 : 1.9}
                  className={isActive ? "text-(--color-navigation)" : "text-(--color-text-muted)"}
                  aria-hidden="true"
                />
              </span>
              <span className={clsx("text-[11px]", isActive ? "font-medium text-(--color-navigation)" : "text-(--color-text-muted)")}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
