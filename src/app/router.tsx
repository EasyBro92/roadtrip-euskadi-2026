import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { EntryRedirect } from "./EntryRedirect";
import { RootLayout } from "./layout/RootLayout";

type Modulo = Record<string, ComponentType>;

/** Las pantallas con su forma de cargarse, para poder traerlas antes de que se pidan. */
const cargadores = new Map<string, () => Promise<Modulo>>();

/*
 * Code splitting por ruta (sección 48: "lazy loading, code splitting"). Cada
 * pantalla es su propio chunk; solo se descarga cuando el usuario navega a ella.
 *
 * `pagina` guarda además cómo se carga cada una. `import()` devuelve siempre
 * la misma promesa para el mismo módulo, así que pedirla por adelantado no la
 * descarga dos veces: cuando React la necesita, ya está.
 */
function pagina(cargar: () => Promise<Modulo>, nombre: string) {
  cargadores.set(nombre, cargar);
  return lazy(() => cargar().then((m) => ({ default: m[nombre] })));
}

const WelcomePage = pagina(() => import("../pages/WelcomePage"), "WelcomePage");
const TripsPage = pagina(() => import("../pages/TripsPage"), "TripsPage");
const GeneratePage = pagina(() => import("../pages/GeneratePage"), "GeneratePage");
const ExplorePage = pagina(() => import("../pages/ExplorePage"), "ExplorePage");
const MapPage = pagina(() => import("../pages/MapPage"), "MapPage");
const ItineraryPage = pagina(() => import("../pages/ItineraryPage"), "ItineraryPage");
const JournalPage = pagina(() => import("../pages/JournalPage"), "JournalPage");
const ExpensesPage = pagina(() => import("../pages/ExpensesPage"), "ExpensesPage");
const MorePage = pagina(() => import("../pages/MorePage"), "MorePage");
const VehiclePage = pagina(() => import("../pages/VehiclePage"), "VehiclePage");
const AchievementsPage = pagina(() => import("../pages/AchievementsPage"), "AchievementsPage");
const FavoritesPage = pagina(() => import("../pages/FavoritesPage"), "FavoritesPage");
const ChecklistPage = pagina(() => import("../pages/ChecklistPage"), "ChecklistPage");
const PlacesLibraryPage = pagina(() => import("../pages/PlacesLibraryPage"), "PlacesLibraryPage");
const SharePage = pagina(() => import("../pages/SharePage"), "SharePage");
const OfflinePage = pagina(() => import("../pages/OfflinePage"), "OfflinePage");
const SettingsPage = pagina(() => import("../pages/SettingsPage"), "SettingsPage");
const HelpPage = pagina(() => import("../pages/HelpPage"), "HelpPage");
const SummaryPage = pagina(() => import("../pages/SummaryPage"), "SummaryPage");
const CopilotPage = pagina(() => import("../pages/CopilotPage"), "CopilotPage");
const NearbyPage = pagina(() => import("../pages/NearbyPage"), "NearbyPage");
const SavedPlacesPage = pagina(() => import("../pages/SavedPlacesPage"), "SavedPlacesPage");
const DocumentsPage = pagina(() => import("../pages/DocumentsPage"), "DocumentsPage");
const VisitedPage = pagina(() => import("../pages/VisitedPage"), "VisitedPage");
const MyReviewsPage = pagina(() => import("../pages/MyReviewsPage"), "MyReviewsPage");
const AlbumPage = pagina(() => import("../pages/AlbumPage"), "AlbumPage");
const PrepararPage = pagina(() => import("../pages/PrepararPage"), "PrepararPage");
const ImportarPage = pagina(() => import("../pages/ImportarPage"), "ImportarPage");
const NotesPage = pagina(() => import("../pages/NotesPage"), "NotesPage");
const ReturnTripPage = pagina(() => import("../pages/ReturnTripPage"), "ReturnTripPage");

/** Qué pantalla corresponde a cada dirección de entrada. */
const PANTALLA_DE: Record<string, string> = {
  "/viajes": "TripsPage",
  "/explorar": "ExplorePage",
  "/crear": "GeneratePage",
  "/viaje": "WelcomePage",
  "/mapa": "MapPage",
  "/itinerario": "ItineraryPage",
  "/diario": "JournalPage",
  "/gastos": "ExpensesPage",
  "/mas": "MorePage",
};

function traer(nombre: string | undefined): void {
  if (!nombre) return;
  void cargadores.get(nombre)?.().catch(() => undefined);
}

/*
 * La pantalla por la que se entra se pide YA, mientras React arranca.
 *
 * Antes la cadena era: descargar la app, ejecutarla, montar el router, y sólo
 * entonces descubrir qué pantalla hacía falta y pedirla. Ese último viaje se
 * hacía con la pantalla en blanco. Aquí se lanza en cuanto se lee este
 * fichero, en paralelo con todo lo demás.
 *
 * La raíz redirige a Mis viajes o al mapa según un ajuste que aún no se ha
 * leído, así que se piden las dos: la que sobra es la primera que se abre
 * después de todas formas.
 */
{
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const ruta = window.location.pathname.slice(base.length).replace(/\/$/, "") || "/";
  if (ruta === "/") {
    traer("TripsPage");
    traer("MapPage");
  } else {
    traer(PANTALLA_DE[ruta]);
  }
}

/**
 * Con la app ya pintada y quieta, trae las cinco pestañas y los modales.
 *
 * Así cambiar de pestaña no espera a nada: ni a la red la primera vez, ni a
 * leer y compilar el fichero las siguientes. Se hace en ratos libres y de una
 * en una para no competir con lo que el usuario esté tocando.
 */
export function precargarPantallas(alTerminar?: () => void): void {
  const pendientes = ["MapPage", "ItineraryPage", "ExpensesPage", "JournalPage", "MorePage", "TripsPage", "WelcomePage", "ExplorePage"];
  const enRatoLibre: (tarea: () => void) => void =
    "requestIdleCallback" in window ? (tarea) => window.requestIdleCallback(tarea, { timeout: 3000 }) : (tarea) => window.setTimeout(tarea, 300);

  const siguiente = () => {
    const nombre = pendientes.shift();
    if (!nombre) {
      alTerminar?.();
      return;
    }
    const cargar = cargadores.get(nombre);
    if (!cargar) return siguiente();
    void cargar()
      .catch(() => undefined)
      .then(() => enRatoLibre(siguiente));
  };
  enRatoLibre(siguiente);
}

function PageSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-(--color-bg)">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-(--color-navigation) border-t-transparent" role="status" aria-label="Cargando" />
    </div>
  );
}

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<PageSkeleton />}>{node}</Suspense>;
}

export const router = createBrowserRouter([
  {
    // RootLayout envuelve los dos niveles: es quien dibuja modales y avisos,
    // que antes solo existían dentro de un viaje.
    element: <RootLayout />,
    children: [
  // Nivel 1 — la app: varios viajes y el catálogo.
  { path: "/", element: <EntryRedirect /> },
  { path: "/viajes", element: withSuspense(<TripsPage />) },
  { path: "/explorar", element: withSuspense(<ExplorePage />) },
  { path: "/crear", element: withSuspense(<GeneratePage />) },
  { path: "/importar", element: withSuspense(<ImportarPage />) },

  // Nivel 2 — dentro de un viaje. El Resumen es la antigua portada.
  { path: "/viaje", element: withSuspense(<WelcomePage />) },
  {
    element: <AppShell />,
    children: [
      { path: "/mapa", element: withSuspense(<MapPage />) },
      { path: "/itinerario", element: withSuspense(<ItineraryPage />) },
      { path: "/diario", element: withSuspense(<JournalPage />) },
      { path: "/gastos", element: withSuspense(<ExpensesPage />) },
      { path: "/mas", element: withSuspense(<MorePage />) },
      { path: "/mas/coche", element: withSuspense(<VehiclePage />) },
      // La dirección antigua sigue valiendo para accesos guardados.
      { path: "/mas/mi-golf", element: <Navigate to="/mas/coche" replace /> },
      { path: "/mas/logros", element: withSuspense(<AchievementsPage />) },
      { path: "/mas/favoritos", element: withSuspense(<FavoritesPage />) },
      { path: "/mas/checklist", element: withSuspense(<ChecklistPage />) },
      { path: "/mas/lugares", element: withSuspense(<PlacesLibraryPage />) },
      { path: "/mas/compartir", element: withSuspense(<SharePage />) },
      { path: "/mas/offline", element: withSuspense(<OfflinePage />) },
      { path: "/mas/configuracion", element: withSuspense(<SettingsPage />) },
      { path: "/mas/ayuda", element: withSuspense(<HelpPage />) },
      { path: "/mas/copiloto", element: withSuspense(<CopilotPage />) },
      { path: "/mas/cerca", element: withSuspense(<NearbyPage />) },
      { path: "/mas/guardados", element: withSuspense(<SavedPlacesPage />) },
      { path: "/mas/documentos", element: withSuspense(<DocumentsPage />) },
      { path: "/mas/visitados", element: withSuspense(<VisitedPage />) },
      { path: "/mas/valoraciones", element: withSuspense(<MyReviewsPage />) },
      { path: "/mas/album", element: withSuspense(<AlbumPage />) },
      { path: "/mas/preparar", element: withSuspense(<PrepararPage />) },
      { path: "/mas/notas", element: withSuspense(<NotesPage />) },
      { path: "/mas/regreso", element: withSuspense(<ReturnTripPage />) },
      { path: "/resumen", element: withSuspense(<SummaryPage />) },
    ],
  },
      { path: "*", element: <Navigate to="/mapa" replace /> },
    ],
  },
], {
  // En GitHub Pages la app se sirve desde /<repo>/, no desde la raíz. Sin esto
  // el router no reconoce esa ruta, cae en el comodín y redirige a /mapa en la
  // raíz del dominio: la app parece funcionar, pero recargar da 404.
  basename: import.meta.env.BASE_URL,
});
