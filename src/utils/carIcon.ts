/**
 * Ilustración genérica de un compacto negro visto desde arriba (sección 5):
 * silueta propia, sin logotipos ni proporciones que repliquen un modelo real
 * con marca registrada. La forma apunta "hacia arriba" (norte) en reposo;
 * `car-rotator` gira ese contenedor según el bearing real entre paradas.
 * Fallback a un icono de punto genérico si algo falla al montar el marcador.
 */
export function buildCarMarkerHtml(variant: "light" | "dark" = "light", bearingDeg = 0): string {
  const bodyColor = "#161618";
  const glassColor = variant === "dark" ? "#3a3a3f" : "#2b2b30";
  const outline = variant === "dark" ? "#f2f2f0" : "#ffffff";

  return `
    <div class="vehicle-marker" style="width:34px;height:34px;">
      <div class="car-rotator" style="width:100%;height:100%;transform:rotate(${bearingDeg}deg);transition:transform 0.12s linear;">
        <svg width="34" height="34" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="17" cy="26" rx="7" ry="2.2" fill="rgba(0,0,0,0.28)" />
          <rect x="9" y="5" width="16" height="22" rx="6" fill="${bodyColor}" stroke="${outline}" stroke-width="1.5" />
          <rect x="11.5" y="8" width="11" height="7" rx="2.2" fill="${glassColor}" />
          <rect x="11.5" y="18" width="11" height="6" rx="2" fill="${glassColor}" opacity="0.7" />
          <circle cx="11.5" cy="9" r="1.3" fill="${outline}" />
          <circle cx="22.5" cy="9" r="1.3" fill="${outline}" />
        </svg>
      </div>
    </div>
  `;
}

export function buildGenericMarkerHtml(): string {
  return `<div style="width:16px;height:16px;border-radius:50%;background:#161618;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`;
}
