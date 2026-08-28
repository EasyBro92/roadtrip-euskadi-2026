import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AvisoSinConexion } from "../../components/AvisoSinConexion";
import { useTripStore } from "../../stores/useTripStore";
import { BottomNav } from "./BottomNav";

/**
 * Contenedor de las pantallas de dentro de un viaje: altura dinámica real
 * (100dvh), zonas seguras, navegación fija abajo. Los modales y avisos ya no
 * viven aquí sino en RootLayout, para que también funcionen en las pantallas
 * de nivel de app (Mis viajes, Explorar).
 */
export function AppShell() {
  const sincronizarDiaDeHoy = useTripStore((s) => s.sincronizarDiaDeHoy);

  // Una vez al abrir: si hoy es un día del viaje, es el día que se enseña.
  useEffect(() => {
    sincronizarDiaDeHoy();
  }, [sincronizarDiaDeHoy]);

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
