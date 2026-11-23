import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AvisoSinConexion } from "../../components/AvisoSinConexion";
import { Celebracion } from "../../components/Celebracion";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import { avisosDeReservas, DocumentService } from "../../services/documents/DocumentService";
import { BotonCrear } from "./BotonCrear";
import { BottomNav } from "./BottomNav";

/** Pantallas donde sale el botón +. En el mapa no: ya tiene sus botones y la hoja de abajo. */
const CON_BOTON_CREAR = new Set(["/itinerario", "/diario", "/mas"]);

/**
 * Contenedor de las pantallas de dentro de un viaje: altura dinámica real
 * (100dvh), zonas seguras, navegación fija abajo. Los modales y avisos ya no
 * viven aquí sino en RootLayout, para que también funcionen en las pantallas
 * de nivel de app (Mis viajes, Explorar).
 */
export function AppShell() {
  const sincronizarDiaDeHoy = useTripStore((s) => s.sincronizarDiaDeHoy);
  const { pathname } = useLocation();

  // Una vez al abrir: si hoy es un día del viaje, es el día que se enseña.
  useEffect(() => {
    sincronizarDiaDeHoy();
  }, [sincronizarDiaDeHoy]);

  // Una vez por sesión: reservas de hoy o mañana y cancelaciones que vencen.
  useEffect(() => {
    try {
      if (sessionStorage.getItem("avisos-reservas")) return;
      sessionStorage.setItem("avisos-reservas", "1");
    } catch {
      // Sin sessionStorage (modo privado estricto) se avisa igual.
    }
    void DocumentService.listar()
      .then((docs) => avisosDeReservas(docs).forEach((a) => useUIStore.getState().pushToast(a, "info")))
      .catch(() => undefined);
  }, []);

  return (
    <div className="app-shell safe-top">
      <AvisoSinConexion />
      <main className="relative min-h-0 flex-1 overflow-hidden">
        {/* La clave es la ruta: al cambiar de pantalla, la nueva entra con su
            animación en vez de aparecer de golpe. */}
        <div key={pathname} className="pantalla-entra h-full">
          <Outlet />
        </div>
        {CON_BOTON_CREAR.has(pathname) && <BotonCrear />}
      </main>
      <BottomNav />
      <Celebracion />
    </div>
  );
}
