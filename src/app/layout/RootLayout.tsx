import { Outlet } from "react-router-dom";
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
export function RootLayout() {
  return (
    <>
      <ToastStack />
      <ModalHost />
      <Outlet />
    </>
  );
}
