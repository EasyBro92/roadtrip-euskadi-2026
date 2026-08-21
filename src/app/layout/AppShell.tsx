import { Outlet } from "react-router-dom";
import { ModalHost } from "../../components/ModalHost";
import { ToastStack } from "../../components/ToastStack";
import { BottomNav } from "./BottomNav";

/** Contenedor raíz: altura dinámica real (100dvh), zonas seguras, navegación fija abajo. */
export function AppShell() {
  return (
    <div className="app-shell safe-top">
      <ToastStack />
      <ModalHost />
      <main className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
