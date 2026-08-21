import QRCode from "qrcode";
import type { Stop, Trip } from "../../types";
import { validateExportedState, type ExportedState } from "../storage/schema";

const QR_SAFE_BYTE_LIMIT = 2200; // Margen práctico para que el QR (nivel L) siga siendo legible en móvil.

async function compressToBase64(json: string): Promise<string> {
  if (typeof CompressionStream === "undefined") return btoa(unescape(encodeURIComponent(json)));

  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"));
  const compressedBuffer = await new Response(stream).arrayBuffer();
  const bytes = new Uint8Array(compressedBuffer);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

async function decompressFromBase64(base64: string): Promise<string> {
  const binary = atob(base64);
  if (typeof DecompressionStream === "undefined") return decodeURIComponent(escape(binary));

  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  const decompressedBuffer = await new Response(stream).arrayBuffer();
  return new TextDecoder().decode(decompressedBuffer);
}

export type ShareOutcome =
  | { kind: "native-share"; ok: true }
  | { kind: "clipboard"; ok: true }
  | { kind: "unsupported"; ok: false; reason: string };

/**
 * Compartir (sección 43). Sin backend propio no hay enlaces públicos reales:
 * se ofrece Web Share API cuando existe, copiar al portapapeles como
 * fallback, y exportar/importar JSON + QR con los datos comprimidos.
 * Nunca se simula un enlace público que no existe de verdad.
 */
export const SharingService = {
  canUseNativeShare(): boolean {
    return typeof navigator.share === "function";
  },

  async shareSummary(trip: Trip, textSummary: string): Promise<ShareOutcome> {
    if (this.canUseNativeShare()) {
      try {
        await navigator.share({ title: trip.name, text: textSummary });
        return { kind: "native-share", ok: true };
      } catch {
        // El usuario canceló el share sheet: no es un error a mostrar.
      }
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(textSummary);
      return { kind: "clipboard", ok: true };
    }

    return { kind: "unsupported", ok: false, reason: "Este navegador no soporta Web Share API ni portapapeles." };
  },

  buildDaySummary(trip: Trip, dayId: string, stops: Stop[]): string {
    const day = trip.days.find((d) => d.id === dayId);
    if (!day) return "";
    const dayStops = day.stopIds.map((id) => stops.find((s) => s.id === id)).filter((s): s is Stop => Boolean(s));
    return [`${trip.name} — ${day.title} (${day.date})`, ...dayStops.map((s) => `• ${s.name}`)].join("\n");
  },

  buildStopSummary(stop: Stop): string {
    return `${stop.name}\n${stop.shortDescription}\n${stop.googleMapsUrl}`;
  },

  /**
   * Genera un QR con el estado exportado comprimido. Si no cabe con margen
   * de lectura razonable, lo dice explícitamente en vez de truncar datos.
   */
  async generateQR(exportedState: ExportedState): Promise<{ dataUrl: string } | { error: string }> {
    const json = JSON.stringify(exportedState);
    const compressed = await compressToBase64(json);

    if (compressed.length > QR_SAFE_BYTE_LIMIT) {
      return {
        error: `El viaje actual (${(compressed.length / 1024).toFixed(1)} KB comprimidos) es demasiado grande para un QR legible. Usa "Exportar JSON" en su lugar.`,
      };
    }

    const dataUrl = await QRCode.toDataURL(compressed, { errorCorrectionLevel: "L", margin: 1, width: 480 });
    return { dataUrl };
  },

  async decodeQRPayload(compressedBase64: string): Promise<{ success: true; data: ExportedState } | { success: false; error: string }> {
    try {
      const json = await decompressFromBase64(compressedBase64);
      const parsed = JSON.parse(json);
      return validateExportedState(parsed);
    } catch (error) {
      return { success: false, error: `No se pudo leer el código QR: ${(error as Error).message}` };
    }
  },
};
