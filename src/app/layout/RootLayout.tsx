import { Outlet, useLocation } from "react-router-dom";
import { ModalHost } from "../../components/ModalHost";
import { ToastStack } from "../../components/ToastStack";

/**
 * Envuelve **todas** las rutas, de ambos niveles.
 *
 * Los modales y los avisos vivían dentro de AppShell, que solo cubre las
 * pantallas de dentro de un viaje. Al añadir el nivel de la app (Mis viajes,
 * Explorar, Resumen) esas pantallas se quedaron sin quien los dibujara: pedir
 * confirmación para borrar un viaje, o elegir día al añadir una parada del
 * catálogo, cambiaba el estado y no aparecía nada en pantalla.
 */
/** Pantallas de dentro de un viaje: esas ya se animan en AppShell, una a una. */
const DENTRO_DEL_VIAJE = /\/(mapa|itinerario|diario|gastos|mas|resumen)(\/|$)/;

export function RootLayout() {
  const { pathname } = useLocation();
  const dentro = DENTRO_DEL_VIAJE.test(pathname);
  return (
    <>
      <ToastStack />
      <ModalHost />
      {/* Mis viajes, Explorar, Crear… entran animadas. Las de dentro de un
          viaje comparten una sola clave para que AppShell (con su barra de
          abajo) no se vuelva a montar en cada pestaña. */}
      <div key={dentro ? "viaje" : pathname} className={dentro ? "h-full" : "pantalla-entra h-full"}>
        <Outlet />
      </div>
    </>
  );
}
