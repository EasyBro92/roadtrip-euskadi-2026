import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FAQ = [
  { q: "¿Necesito internet para usar la app?", a: "El itinerario, notas, gastos y fotos ya guardadas funcionan sin conexión. El mapa necesita conexión la primera vez que visitas una zona nueva; después esa zona queda cacheada." },
  { q: "¿La app sustituye a un navegador GPS?", a: "No. La navegación de esta app es orientativa. Usa el botón \"Abrir en Google Maps\" de cada parada para navegación real turn-by-turn." },
  { q: "¿Dónde se guardan mis datos?", a: "Todo se guarda localmente en tu dispositivo (localStorage + IndexedDB). Nada se sube a ningún servidor salvo que actives el copiloto remoto opcional." },
  { q: "¿Por qué algunas rutas aparecen como aproximadas?", a: "Cuando ningún proveedor de rutas responde, la app dibuja una línea recta entre paradas y lo marca explícitamente en vez de inventar una ruta real." },
  { q: "¿Cómo instalo la app en Android?", a: "Desde Chrome, abre el menú (⋮) y elige \"Instalar aplicación\" o \"Añadir a pantalla de inicio\"." },
  { q: "¿Y en iPhone?", a: "Desde Safari, pulsa Compartir → \"Añadir a pantalla de inicio\". iOS no soporta el instalador automático de PWA como Android." },
];

export function HelpPage() {
  const navigate = useNavigate();
  return (
    <div className="safe-x h-full overflow-y-auto bg-(--color-bg) px-4 pt-4 pb-8">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-(--color-text-muted)">
        <ArrowLeft size={15} aria-hidden="true" /> Atrás
      </button>
      <h1 className="mb-4 text-xl font-bold">Ayuda</h1>
      <div className="space-y-3">
        {FAQ.map((item) => (
          <details key={item.q} className="rounded-(--radius-card) border bg-(--color-surface) p-3.5 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
            <summary className="cursor-pointer text-sm font-semibold">{item.q}</summary>
            <p className="mt-2 text-sm text-(--color-text-muted)">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
