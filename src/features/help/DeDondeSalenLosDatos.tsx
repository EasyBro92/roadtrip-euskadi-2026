import { Smartphone, Wifi } from "lucide-react";

interface Fuente {
  que: string;
  donde: string;
}

/** Lo que sale del propio móvil y no consulta nada. */
const EN_TU_MOVIL: string[] = [
  "El itinerario, los días y las paradas",
  "Notas, gastos y el reparto de cuentas",
  "Tus fotos, reservas y documentos",
  "Tus valoraciones, reseñas y listas de \"Quiero ir\"",
  "El Copiloto: son reglas dentro de la app, no una inteligencia artificial",
  "El mapa de las zonas que ya has mirado con conexión",
];

/** Lo que sí sale a internet, y a dónde exactamente. */
const CON_INTERNET: Fuente[] = [
  { que: "Las imágenes del mapa", donde: "CARTO y OpenStreetMap" },
  { que: "Buscar un lugar por su nombre", donde: "Nominatim (OpenStreetMap)" },
  { que: "Horarios, teléfono, web y precio de un sitio", donde: "Nominatim (OpenStreetMap)" },
  { que: "\"Qué hay cerca\" y los sitios de interés del mapa", donde: "Overpass (OpenStreetMap) y Wikidata" },
  { que: "Las fotos que salen al añadir una parada", donde: "Wikimedia Commons" },
  { que: "Las rutas por carretera", donde: "OSRM, sobre datos de OpenStreetMap" },
  { que: "La previsión del tiempo", donde: "Open-Meteo" },
  { que: "\"Proponme un viaje\"", donde: "Overpass y Wikidata" },
];

/**
 * De dónde sale cada cosa.
 *
 * Está en la app y no sólo en una conversación porque es justo la duda que
 * aparece en carretera, cuando algo no carga: ¿es la app, es la cobertura, o
 * es que depende de algo que no está?
 */
export function DeDondeSalenLosDatos() {
  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-(--radius-card) border bg-(--color-surface) p-3.5 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
        <p className="mb-1 text-sm font-semibold text-(--color-text)">La app no depende de ninguna inteligencia artificial</p>
        <p className="text-sm text-(--color-text-muted)">
          No hay ninguna llamada a Claude ni a ningún otro servicio de IA. Tampoco hay cuentas, ni servidor propio, ni nada que se pueda caer y dejarte sin app: lo que
          tienes instalado es la aplicación entera. Los sitios y los datos salen de OpenStreetMap y Wikipedia, que son mapas y enciclopedias abiertas.
        </p>
      </div>

      <div className="rounded-(--radius-card) border bg-(--color-surface) p-3.5 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-(--color-text)">
          <Smartphone size={15} className="text-(--color-completed)" aria-hidden="true" /> Vive en tu móvil, funciona sin cobertura
        </p>
        <ul className="space-y-1 text-sm text-(--color-text-muted)">
          {EN_TU_MOVIL.map((x) => (
            <li key={x}>· {x}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-(--radius-card) border bg-(--color-surface) p-3.5 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-(--color-text)">
          <Wifi size={15} className="text-(--color-link)" aria-hidden="true" /> Necesita datos o wifi
        </p>
        <ul className="space-y-1.5 text-sm text-(--color-text-muted)">
          {CON_INTERNET.map((f) => (
            <li key={f.que}>
              · {f.que} — <span className="text-(--color-text)">{f.donde}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-(--color-text-muted)">
          Son servidores públicos y gratuitos mantenidos por voluntarios. Por eso la app pregunta despacio y guarda lo que le responden: para no abusar y para que la
          segunda vez no haga falta conexión.
        </p>
      </div>
    </div>
  );
}
