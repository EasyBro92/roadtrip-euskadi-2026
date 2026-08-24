/**
 * Mapamundi de fondo, muy tenue, para que las pantallas de nivel de app no
 * sean un blanco liso.
 *
 * Es una silueta muy simplificada a propósito: a esta opacidad no se pide que
 * sea exacta, solo que se reconozca que hay un mapa. Va marcado como
 * decorativo para que un lector de pantalla lo ignore.
 */
export function WorldMapBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden" aria-hidden="true">
      <svg viewBox="0 0 1000 500" className="h-auto w-full opacity-[0.055]" fill="var(--color-text)" xmlns="http://www.w3.org/2000/svg">
        {/* Norteamérica */}
        <path d="M60 90 L200 70 L255 95 L245 130 L275 140 L265 175 L230 200 L215 245 L190 240 L175 205 L140 190 L120 155 L75 140 Z" />
        {/* Centroamérica */}
        <path d="M195 250 L235 265 L250 295 L228 292 L205 268 Z" />
        {/* Sudamérica */}
        <path d="M250 300 L300 295 L325 330 L318 385 L295 430 L270 465 L252 440 L245 390 L232 345 Z" />
        {/* Groenlandia */}
        <path d="M300 40 L360 35 L378 70 L345 95 L308 75 Z" />
        {/* Europa */}
        <path d="M455 95 L520 80 L560 95 L548 125 L570 140 L545 165 L500 158 L470 165 L452 138 Z" />
        {/* África */}
        <path d="M470 180 L545 172 L580 195 L575 250 L545 315 L512 375 L482 350 L472 295 L452 240 Z" />
        {/* Asia */}
        <path d="M575 75 L720 60 L830 80 L880 110 L860 150 L800 165 L760 145 L700 160 L640 150 L590 130 Z" />
        {/* India */}
        <path d="M660 170 L710 165 L722 205 L692 250 L668 205 Z" />
        {/* Sudeste asiático */}
        <path d="M760 180 L820 175 L845 205 L810 235 L775 215 Z" />
        {/* Australia */}
        <path d="M800 320 L885 310 L910 345 L885 390 L820 385 L795 355 Z" />
        {/* Nueva Zelanda */}
        <path d="M930 400 L950 395 L955 425 L935 430 Z" />
      </svg>
    </div>
  );
}
