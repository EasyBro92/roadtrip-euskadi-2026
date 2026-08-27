import { Outlet } from "react-router-dom";
import { AvisoSinConexion } from "../../components/AvisoSinConexion";
import { BottomNav } from "./BottomNav";

/**
 * Contenedor de las pantallas de dentro de un viaje: altura dinámica real
 * (100dvh), zonas seguras, navegación fija abajo. Los modales y avisos ya no
 * viven aquí sino en RootLayout, para que también funcionen en las pantallas
 * de nivel de app (Mis viajes, Explorar).
 */
export function AppShell() {
  return (
    <div className="app-shell safe-top">
      <AvisoSinConexion />
      <main className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
