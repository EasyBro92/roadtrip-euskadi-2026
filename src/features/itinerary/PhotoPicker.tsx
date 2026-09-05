import { Check, ImageOff, Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PhotoSearchService, type PhotoCandidate } from "../../services/photos/PhotoSearchService";
import type { Coordinates } from "../../types";

interface PhotoPickerProps {
  /** Se usa para buscar por cercanía, que acierta mucho más que por nombre. */
  coordinates?: Coordinates;
  /** Nombre de la parada: primer término de búsqueda por texto. */
  name: string;
  value?: string;
  onChange: (url: string | undefined) => void;
}

/**
 * Elige la foto de una parada entre imágenes de Wikimedia Commons, todas de
 * licencia libre.
 *
 * Busca por coordenadas siempre que las haya: por texto, "Pamplona" devuelve
 * fotos de la de Colombia. El buscador por nombre queda como segunda vía para
 * afinar, no como opción principal.
 */
export function PhotoPicker({ coordinates, name, value, onChange }: PhotoPickerProps) {
  const [candidatas, setCandidatas] = useState<PhotoCandidate[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consulta, setConsulta] = useState("");

  const buscarCerca = useCallback(async () => {
    if (!coordinates) return;
    setCargando(true);
    setError(null);
    try {
      const encontradas = await PhotoSearchService.searchNearby(coordinates);
      setCandidatas(encontradas);
      if (encontradas.length === 0) setError("No hay fotos libres de esta zona. Prueba a buscar por nombre.");
    } catch {
      setError("No se pudo conectar con Wikimedia. Revisa tu conexión.");
    } finally {
      setCargando(false);
    }
  }, [coordinates]);

  async function buscarPorTexto() {
    const texto = consulta.trim() || name;
    if (texto.length < 3) return;
    setCargando(true);
    setError(null);
    try {
      const encontradas = await PhotoSearchService.searchByText(texto);
      setCandidatas(encontradas);
      if (encontradas.length === 0) setError(`Sin resultados para "${texto}".`);
    } catch {
      setError("No se pudo conectar con Wikimedia. Revisa tu conexión.");
    } finally {
      setCargando(false);
    }
  }

  // Al abrir el editor ya se ofrecen fotos del entorno, sin tener que buscar.
  useEffect(() => {
    void buscarCerca();
  }, [buscarCerca]);

  return (
    <div className="mb-4">
      <label className="mb-1 block text-xs font-medium text-(--color-text-muted)">Foto de la parada</label>

      {value && (
        <div className="mb-2 flex items-center gap-2">
          <img src={value} alt="" className="h-16 w-24 rounded-lg object-cover" />
          <button onClick={() => onChange(undefined)} className="text-xs font-medium text-(--color-cancelled)">
            Quitar foto
          </button>
        </div>
      )}

      <div className="mb-2 flex gap-2">
        <input
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && buscarPorTexto()}
          placeholder={`Buscar otra cosa (por defecto: ${name || "la parada"})`}
          className="min-w-0 flex-1 rounded-(--radius-control) border bg-(--color-bg) px-3 py-2 text-sm text-(--color-text)"
          style={{ borderColor: "var(--color-border)" }}
        />
        <button
          onClick={buscarPorTexto}
          aria-label="Buscar fotos por nombre"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-(--radius-control) border"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Search size={16} aria-hidden="true" />
        </button>
      </div>

      {cargando && (
        <p className="flex items-center gap-2 py-3 text-xs text-(--color-text-muted)">
          <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Buscando fotos…
        </p>
      )}

      {!cargando && error && (
        <p className="flex items-center gap-2 py-3 text-xs text-(--color-text-muted)">
          <ImageOff size={14} aria-hidden="true" /> {error}
        </p>
      )}

      {!cargando && candidatas.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {candidatas.map((foto) => {
              const elegida = value === foto.url;
              return (
                <button
                  key={foto.url}
                  onClick={() => onChange(elegida ? undefined : foto.url)}
                  aria-pressed={elegida}
                  aria-label={`Usar la foto ${foto.title}`}
                  className={`relative aspect-[4/3] overflow-hidden rounded-lg border-2 ${elegida ? "border-(--color-navigation)" : "border-transparent"}`}
                >
                  <img src={foto.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  {elegida && (
                    <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-(--color-navigation) text-white">
                      <Check size={12} aria-hidden="true" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-(--color-text-muted)">Fotos de Wikimedia Commons, de licencia libre.</p>
        </>
      )}
    </div>
  );
}
