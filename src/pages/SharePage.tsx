import { ArrowLeft, Download, FileJson, Images, Link2, Map as MapIcon, QrCode, Share2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExportService } from "../services/export/ExportService";
import { PhotoExportService } from "../services/export/PhotoExportService";
import { SharingService } from "../services/sharing/SharingService";
import { useSettingsStore } from "../stores/useSettingsStore";
import { useTripStore } from "../stores/useTripStore";
import { useUIStore } from "../stores/useUIStore";

export function SharePage() {
  const navigate = useNavigate();
  const state = useTripStore((s) => s);
  const settings = useSettingsStore((s) => s.settings);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pushToast = useUIStore((s) => s.pushToast);

  const exportable = {
    trip: state.trip,
    stops: Object.values(state.stopsById),
    expenses: state.expenses,
    refuels: state.refuels,
    favorites: state.favorites,
    notes: state.notes,
    checklist: state.checklist,
    achievementsState: state.achievementsState,
    settings,
  };

  const [empaquetando, setEmpaquetando] = useState(false);

  /**
   * Enlace con el itinerario dentro. Sin servidor: los datos viajan tras la
   * almohadilla de la dirección, que el navegador no envía a ninguna parte.
   */
  async function copiarEnlace() {
    const resultado = await SharingService.enlaceDeItinerario(state.trip, state.stopsById);
    if ("error" in resultado) {
      pushToast(resultado.error, "error");
      return;
    }
    const compartido = await SharingService.shareSummary(state.trip, resultado.url);
    if (compartido.kind === "clipboard") pushToast("Enlace copiado. Pégalo donde quieras.", "success");
    else if (compartido.kind === "unsupported") pushToast(compartido.reason, "error");
  }

  /**
   * Saca las fotos del viaje a la carpeta de Descargas.
   *
   * Es su única vía de escape: dentro de la app viven en el almacenamiento del
   * navegador, y si desinstalas la app o el sistema libera espacio, se pierden.
   * Una PWA no puede escribir en la galería del móvil, así que un ZIP en
   * Descargas es lo más cerca que se puede llegar.
   */
  async function exportarFotos() {
    setEmpaquetando(true);
    try {
      const { fotos, bytes } = await PhotoExportService.descargarZip(state.trip, state.stopsById);
      if (fotos === 0) {
        pushToast("Este viaje aún no tiene fotos.", "info");
        return;
      }
      // En KB por debajo de un mega: "0.0 MB" no le dice nada a nadie.
      const tamano = bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
      pushToast(`${fotos} ${fotos === 1 ? "foto" : "fotos"} · ${tamano} en Descargas.`, "success");
    } catch (error) {
      pushToast(`No se pudo crear el ZIP: ${(error as Error).message}`, "error");
    } finally {
      setEmpaquetando(false);
    }
  }

  async function handleShareSummary() {
    const summary = `${state.trip.name}\n${state.trip.startDate} — ${state.trip.endDate}\n${state.trip.days.map((d) => `• ${d.title}`).join("\n")}`;
    const outcome = await SharingService.shareSummary(state.trip, summary);
    if (outcome.kind === "clipboard") pushToast("Resumen copiado al portapapeles.", "success");
    else if (outcome.kind === "unsupported") pushToast(outcome.reason, "error");
    // "native-share": el propio selector nativo del sistema ya es la confirmación visual.
  }

  async function handleGenerateQR() {
    setBusy(true);
    setQrError(null);
    const exported = ExportService.buildExportedState(exportable);
    const result = await SharingService.generateQR(exported);
    if ("error" in result) setQrError(result.error);
    else setQrDataUrl(result.dataUrl);
    setBusy(false);
  }

  function handleDownload(action: () => void, label: string) {
    action();
    pushToast(`${label}: descarga iniciada.`, "success");
  }

  return (
    <div className="safe-x h-full overflow-y-auto bg-(--color-bg) px-4 pt-4 pb-8">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-(--color-text-muted)">
        <ArrowLeft size={15} aria-hidden="true" /> Atrás
      </button>
      <h1 className="mb-1 text-xl font-bold">Compartir</h1>
      <p className="mb-4 text-xs text-(--color-text-muted)">
        Sin backend propio no existen enlaces públicos reales. Puedes compartir un resumen, exportar el viaje como archivo o generar un QR con los datos.
      </p>

      <div className="space-y-2">
        <ActionRow icon={Share2} label="Compartir resumen del viaje" onClick={handleShareSummary} />
        <ActionRow icon={FileJson} label="Exportar JSON completo" onClick={() => handleDownload(() => ExportService.downloadJSON(exportable), "JSON")} />
        <ActionRow icon={MapIcon} label="Exportar ruta GPX" onClick={() => handleDownload(() => ExportService.downloadGPX(state.trip, Object.values(state.stopsById)), "GPX")} />
        <ActionRow icon={Download} label="Exportar paradas GeoJSON" onClick={() => handleDownload(() => ExportService.downloadGeoJSON(Object.values(state.stopsById)), "GeoJSON")} />
        <ActionRow icon={Link2} label="Compartir el itinerario por enlace" onClick={copiarEnlace} />
        <ActionRow icon={Images} label={empaquetando ? "Preparando el ZIP…" : "Exportar mis fotos (ZIP)"} onClick={exportarFotos} />
        <ActionRow icon={QrCode} label={busy ? "Generando QR…" : "Generar código QR"} onClick={handleGenerateQR} />
      </div>

      {qrError && <p className="mt-3 text-sm text-(--color-cancelled)">{qrError}</p>}
      {qrDataUrl && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <img src={qrDataUrl} alt="Código QR del viaje" className="h-56 w-56 rounded-(--radius-card) border p-2" style={{ borderColor: "var(--color-border)" }} />
          <p className="text-xs text-(--color-text-muted)">Escanéalo desde otra instancia de la app para importar el viaje.</p>
        </div>
      )}
    </div>
  );
}

function ActionRow({ icon: Icon, label, onClick }: { icon: typeof Share2; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-(--radius-card) border bg-(--color-surface) p-3.5 text-left text-sm font-medium shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
      <Icon size={18} className="text-(--color-link)" aria-hidden="true" />
      {label}
    </button>
  );
}
