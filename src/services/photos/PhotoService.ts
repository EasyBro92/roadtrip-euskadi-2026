import { db, type StoredPhoto } from "../storage/db";
import type { ID, Photo } from "../../types";
import { generateId } from "../../utils/id";

const MAX_DIMENSION_PX = 1600;
const JPEG_QUALITY = 0.82;
const THUMBNAIL_DIMENSION_PX = 320;

/** Redimensiona/comprime una imagen en canvas antes de guardarla (sección 19: "comprimir imágenes antes de guardarlas"). */
async function compressImage(file: File, maxDimension: number, quality: number): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto de canvas para comprimir la imagen");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo comprimir la imagen"))), "image/jpeg", quality),
  );

  return { blob, width, height };
}

async function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const PhotoService = {
  /** Sube una foto del usuario (galería o cámara vía <input capture>), comprimida antes de guardar. */
  async addUserPhoto(file: File, target: { stopId: ID | null; dayId: ID | null }, description = ""): Promise<Photo> {
    const [full, thumb] = await Promise.all([compressImage(file, MAX_DIMENSION_PX, JPEG_QUALITY), compressImage(file, THUMBNAIL_DIMENSION_PX, 0.7)]);
    const thumbnailDataUrl = await blobToDataURL(thumb.blob);

    const photo: StoredPhoto = {
      id: generateId("photo"),
      stopId: target.stopId,
      dayId: target.dayId,
      blobKey: generateId("blob"),
      thumbnailDataUrl,
      description,
      isFavorite: false,
      isHero: false,
      takenAt: new Date().toISOString(),
      widthPx: full.width,
      heightPx: full.height,
      sizeBytes: full.blob.size,
      source: "user",
      blob: full.blob,
    };

    await db.photos.add(photo);
    return stripBlob(photo);
  },

  /** Una foto suelta por su id, con su miniatura. Sin el blob grande. */
  async get(photoId: ID): Promise<Photo | null> {
    const row = await db.photos.get(photoId);
    return row ? stripBlob(row) : null;
  },

  async listByStop(stopId: ID): Promise<Photo[]> {
    const rows = await db.photos.where("stopId").equals(stopId).toArray();
    return rows.map(stripBlob);
  },

  async listByDay(dayId: ID): Promise<Photo[]> {
    const rows = await db.photos.where("dayId").equals(dayId).toArray();
    return rows.map(stripBlob);
  },

  async listAll(): Promise<Photo[]> {
    const rows = await db.photos.toArray();
    return rows.map(stripBlob);
  },

  async getObjectUrl(photoId: ID): Promise<string | null> {
    const row = await db.photos.get(photoId);
    if (!row) return null;
    return URL.createObjectURL(row.blob);
  },

  async update(photoId: ID, patch: Partial<Pick<Photo, "description" | "isFavorite" | "isHero">>): Promise<void> {
    await db.photos.update(photoId, patch);
  },

  async remove(photoId: ID): Promise<void> {
    await db.photos.delete(photoId);
  },

  async totalSizeBytes(): Promise<number> {
    const rows = await db.photos.toArray();
    return rows.reduce((sum, r) => sum + r.sizeBytes, 0);
  },
};

function stripBlob(stored: StoredPhoto): Photo {
  const { blob: _blob, ...photo } = stored;
  return photo;
}
