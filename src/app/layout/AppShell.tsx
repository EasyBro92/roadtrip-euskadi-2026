import { useEffect } from "react";
import { Outlet, useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { AvisoSinConexion } from "../../components/AvisoSinConexion";
import { Celebracion } from "../../components/Celebracion";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import { avisosDeReservas, DocumentService } from "../../services/documents/DocumentService";
import { BarraViaje } from "./BarraViaje";
import { BotonCrear } from "./BotonCrear";
import { claseDeTransicion } from "./direccion";
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
  const { pathname, state } = useLocation();
  const tipo = useNavigationType();
  const navigate = useNavigate();

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
      .then((docs) => {
        const avisos = avisosDeReservas(docs);
        const { pushToast } = useUIStore.getState();
        // Uno solo se cuenta entero; varios, en un aviso que lleva a la lista: cuatro avisos apilados tapaban media pantalla.
        if (avisos.length === 1) pushToast(avisos[0], "info");
        else if (avisos.length > 1)
          pushToast(`Tienes ${avisos.length} avisos de reservas: hoy, mañana o cancelaciones que vencen.`, "info", {
            etiqueta: "Ver",
            alPulsar: () => navigate("/mas/documentos"),
          });
      })
      .catch(() => undefined);
  }, [navigate]);

  return (
    <div className="app-shell">
      <BarraViaje />
      <AvisoSinConexion />
      <main className={`relative min-h-0 flex-1 overflow-hidden ${CON_BOTON_CREAR.has(pathname) ? "con-boton-crear" : ""}`}>
        {/* La clave es la ruta: al cambiar de pantalla, la nueva entra con su
            animación en vez de aparecer de golpe. */}
        <div key={pathname} className={`${claseDeTransicion(pathname, tipo, state)} h-full`}>
          <Outlet />
        </div>
        {CON_BOTON_CREAR.has(pathname) && <BotonCrear />}
      </main>
      <BottomNav />
      <Celebracion />
    </div>
  );
}
