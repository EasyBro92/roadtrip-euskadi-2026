import { ArrowLeft, Compass } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Catálogo de rutas prehechas. Todavía sin contenido: las rutas se montarán
 * con el mismo sistema de fotos libres de Wikimedia que ya usan las paradas
 * del viaje (ver scripts/fetch-place-images.mjs).
 */
export function ExplorePage() {
  const navigate = useNavigate();

  return (
    <div className="safe-x min-h-dvh bg-(--color-bg) pb-10 pt-[calc(env(safe-area-inset-top)+20px)]">
      <header className="mb-6 flex items-center gap-2">
        <button onClick={() => navigate("/viajes")} aria-label="Volver a mis viajes" className="-ml-2 p-2">
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <h1 className="text-2xl font-semibold text-(--color-text)">Explorar</h1>
      </header>

      <div
        className="rounded-(--radius-card) border bg-(--color-surface) px-5 py-10 text-center shadow-(--shadow-card)"
        style={{ borderColor: "var(--color-border)" }}
      >
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-(--color-navigation)/10">
          <Compass size={26} className="text-(--color-navigation)" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-base font-semibold text-(--color-text)">Rutas prehechas, en camino</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm text-(--color-text-muted)">
          Aquí encontrarás rutas ya montadas para copiarlas a tus viajes, o para coger de ellas solo las paradas que te
          interesen.
        </p>
      </div>
    </div>
  );
}
