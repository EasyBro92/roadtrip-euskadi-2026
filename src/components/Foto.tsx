import { useState, type ImgHTMLAttributes } from "react";

/**
 * Una imagen que, si no carga, deja un fondo liso en lugar del icono de
 * imagen rota del navegador.
 *
 * Las fotos de lugares vienen de Wikimedia: en carretera sin cobertura, o si
 * su servidor falla, el navegador pintaba un recuadro roto con el borde gris,
 * justo en las portadas que más se ven (Diario, Más, Álbum).
 */
export function Foto({ src, className = "", alt = "", ...resto }: ImgHTMLAttributes<HTMLImageElement>) {
  const [fallida, setFallida] = useState<string | undefined>(undefined);

  if (!src || fallida === src) {
    return <div role={alt ? "img" : undefined} aria-label={alt || undefined} className={`bg-gradient-to-br from-slate-500 to-slate-700 ${className}`} />;
  }
  return <img src={src} alt={alt} className={className} onError={() => setFallida(src)} {...resto} />;
}
