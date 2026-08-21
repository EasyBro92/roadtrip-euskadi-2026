import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "./layout/AppShell";

// Code splitting por ruta (sección 48: "lazy loading, code splitting"). Cada
// pantalla es su propio chunk; solo se descarga cuando el usuario navega a ella.
const WelcomePage = lazy(() => import("../pages/WelcomePage").then((m) => ({ default: m.WelcomePage })));
const MapPage = lazy(() => import("../pages/MapPage").then((m) => ({ default: m.MapPage })));
const ItineraryPage = lazy(() => import("../pages/ItineraryPage").then((m) => ({ default: m.ItineraryPage })));
const JournalPage = lazy(() => import("../pages/JournalPage").then((m) => ({ default: m.JournalPage })));
const ExpensesPage = lazy(() => import("../pages/ExpensesPage").then((m) => ({ default: m.ExpensesPage })));
const MorePage = lazy(() => import("../pages/MorePage").then((m) => ({ default: m.MorePage })));
const VehiclePage = lazy(() => import("../pages/VehiclePage").then((m) => ({ default: m.VehiclePage })));
const AchievementsPage = lazy(() => import("../pages/AchievementsPage").then((m) => ({ default: m.AchievementsPage })));
const FavoritesPage = lazy(() => import("../pages/FavoritesPage").then((m) => ({ default: m.FavoritesPage })));
const ChecklistPage = lazy(() => import("../pages/ChecklistPage").then((m) => ({ default: m.ChecklistPage })));
const PlacesLibraryPage = lazy(() => import("../pages/PlacesLibraryPage").then((m) => ({ default: m.PlacesLibraryPage })));
const SharePage = lazy(() => import("../pages/SharePage").then((m) => ({ default: m.SharePage })));
const OfflinePage = lazy(() => import("../pages/OfflinePage").then((m) => ({ default: m.OfflinePage })));
const SettingsPage = lazy(() => import("../pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const HelpPage = lazy(() => import("../pages/HelpPage").then((m) => ({ default: m.HelpPage })));
const SummaryPage = lazy(() => import("../pages/SummaryPage").then((m) => ({ default: m.SummaryPage })));
const CopilotPage = lazy(() => import("../pages/CopilotPage").then((m) => ({ default: m.CopilotPage })));
const NearbyPage = lazy(() => import("../pages/NearbyPage").then((m) => ({ default: m.NearbyPage })));
const NotesPage = lazy(() => import("../pages/NotesPage").then((m) => ({ default: m.NotesPage })));
const ReturnTripPage = lazy(() => import("../pages/ReturnTripPage").then((m) => ({ default: m.ReturnTripPage })));

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
  { path: "/", element: withSuspense(<WelcomePage />) },
  {
    element: <AppShell />,
    children: [
      { path: "/mapa", element: withSuspense(<MapPage />) },
      { path: "/itinerario", element: withSuspense(<ItineraryPage />) },
      { path: "/diario", element: withSuspense(<JournalPage />) },
      { path: "/gastos", element: withSuspense(<ExpensesPage />) },
      { path: "/mas", element: withSuspense(<MorePage />) },
      { path: "/mas/mi-golf", element: withSuspense(<VehiclePage />) },
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
      { path: "/mas/notas", element: withSuspense(<NotesPage />) },
      { path: "/mas/regreso", element: withSuspense(<ReturnTripPage />) },
      { path: "/resumen", element: withSuspense(<SummaryPage />) },
    ],
  },
  { path: "*", element: <Navigate to="/mapa" replace /> },
]);
