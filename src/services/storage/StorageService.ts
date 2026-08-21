/**
 * NO renombrar aunque la app se llame ahora Easy Travel: es el prefijo de las
 * claves ya guardadas en localStorage. Cambiarlo dejaría huérfanos el viaje,
 * los gastos, el diario y los ajustes de quien ya tenga la app instalada.
 */
const NAMESPACE = "roadtrip-euskadi-2026";
const SCHEMA_VERSION = 1;

/**
 * Envoltorio único sobre localStorage para todo el estado "ligero" (viaje,
 * gastos, logros, ajustes...). Ver DECISIONS.md: los binarios (fotos) van a
 * IndexedDB (`db.ts`), no aquí. Versiona el esquema para poder migrar en el
 * futuro sin perder datos existentes.
 */
export const StorageService = {
  key(name: string): string {
    return `${NAMESPACE}:${name}`;
  },

  get<T>(name: string, fallback: T): T {
    try {
      const raw = window.localStorage.getItem(this.key(name));
      if (!raw) return fallback;
      const parsed = JSON.parse(raw) as { version: number; value: T };
      if (parsed.version !== SCHEMA_VERSION) return fallback;
      return parsed.value;
    } catch {
      return fallback;
    }
  },

  set<T>(name: string, value: T): void {
    try {
      window.localStorage.setItem(this.key(name), JSON.stringify({ version: SCHEMA_VERSION, value }));
    } catch (error) {
      // Cuota excedida u otro error de escritura: no rompemos la app, solo lo señalamos.
      console.error(`[StorageService] No se pudo guardar "${name}"`, error);
    }
  },

  remove(name: string): void {
    window.localStorage.removeItem(this.key(name));
  },

  /** Borra todo lo persistido de la app (sección 47: opción de borrar todos los datos). */
  clearAll(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(`${NAMESPACE}:`)) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  },
};

/** Adaptador de storage para el middleware `persist` de Zustand, reutilizando StorageService. */
export function createZustandStorageAdapter(name: string) {
  return {
    getItem: (): string | null => {
      const raw = window.localStorage.getItem(StorageService.key(name));
      return raw;
    },
    setItem: (_key: string, value: string): void => {
      window.localStorage.setItem(StorageService.key(name), value);
    },
    removeItem: (): void => {
      window.localStorage.removeItem(StorageService.key(name));
    },
  };
}
