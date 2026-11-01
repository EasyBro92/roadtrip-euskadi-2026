import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
// La fuente va dentro de la app: pedida a Google Fonts no quedaba en caché y
// sin conexión la app cambiaba de letra.
import "@fontsource/roboto/latin-400.css";
import "@fontsource/roboto/latin-500.css";
import "@fontsource/roboto/latin-700.css";
import "./styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
