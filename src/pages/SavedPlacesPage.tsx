import { ArrowLeft, Bookmark, FolderInput, Navigation, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSavedPlacesStore, type LugarGuardado } from "../stores/useSavedPlacesStore";
import { useTripStore } from "../stores/useTripStore";
import { useUIStore } from "../stores/useUIStore";
import { googleMapsUrl } from "../utils/geo";
import { openExternalUrl } from "../utils/openExternal";

/**
 * Sitios que quieres visitar algún día, en listas propias.
 *
 * No es lo mismo que Favoritos: aquello marca paradas que ya están en un
 * viaje, y esto guarda sitios sueltos que aún no tienen ni viaje ni fecha.
 */
export function SavedPlacesPage() {
  const navigate = useNavigate();
  const listas = useSavedPlacesStore((s) => s.listas);
  const lugares = useSavedPlacesStore((s) => s.lugares);
  const { crearLista, renombrarLista, borrarLista, quitar, moverA } = useSavedPlacesStore();

  const openModal = useUIStore((s) => s.openModal);
  const pushToast = useUIStore((s) => s.pushToast);
  const addStop = useTripStore((s) => s.addStop);
  const viajeActivo = useTripStore((s) => s.trip.name);

  const [activaId, setActivaId] = useState<string | null>(null);
  const activa = listas.find((l) => l.id === activaId) ?? listas[0] ?? null;
  const suyos = activa ? lugares.filter((p) => p.listaId === activa.id).sort((a, b) => b.addedAt.localeCompare(a.addedAt)) : [];

  function nuevaLista() {
    openModal({
      type: "prompt",
      title: "Nueva lista",
      message: "¿Cómo la llamas?",
      placeholder: "Portugal 2027",
      onSubmit: (nombre) => setActivaId(crearLista(nombre)),
    });
  }

  function renombrar() {
    if (!activa) return;
    openModal({
      type: "prompt",
      title: "Renombrar lista",
      initialValue: activa.nombre,
      onSubmit: (nombre) => renombrarLista(activa.id, nombre),
    });
  }

  function borrar() {
    if (!activa) return;
    const cuantos = suyos.length;
    openModal({
      type: "confirm",
      title: `Borrar "${activa.nombre}"`,
      message: cuantos > 0 ? `Se borrarán también sus ${cuantos} ${cuantos === 1 ? "sitio" : "sitios"}.` : "La lista está vacía.",
      onConfirm: () => {
        borrarLista(activa.id);
        setActivaId(null);
      },
    });
  }

  function anadirAlViaje(lugar: LugarGuardado) {
    openModal({
      type: "day-picker",
      title: `Añadir ${lugar.nombre}`,
      message: `Se añadirá a "${viajeActivo}". ¿A qué día?`,
      onPick: (dayId) => {
        addStop(dayId, { name: lugar.nombre, category: lugar.categoria ?? "ciudad", coordinates: lugar.coordinates });
        pushToast(`${lugar.nombre} añadida a tu itinerario.`, "success");
      },
    });
  }

  function mover(lugar: LugarGuardado) {
    const otras = listas.filter((l) => l.id !== lugar.listaId);
    if (otras.length === 0) {
      pushToast("Sólo tienes una lista. Crea otra para poder mover sitios.", "info");
      return;
    }
    openModal({
      type: "choice",
      title: `Mover ${lugar.nombre}`,
      options: otras.map((l) => ({ id: l.id, label: l.nombre })),
      onPick: (listaId) => {
        moverA(lugar.id, listaId);
        pushToast(`Movido a "${otras.find((l) => l.id === listaId)?.nombre}".`, "success");
      },
    });
  }

  return (
    <div className="safe-x h-full overflow-y-auto bg-(--color-bg) px-4 pt-4 pb-8">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-(--color-text-muted)">
        <ArrowLeft size={15} aria-hidden="true" /> Atrás
      </button>
      <h1 className="mb-1 text-xl font-bold">Quiero ir</h1>
      <p className="mb-4 text-xs text-(--color-text-muted)">
        Sitios guardados para más adelante, sin viaje ni fecha. Cuando montes el viaje, los pasas a un día.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {listas.map((l) => (
          <button
            key={l.id}
            onClick={() => setActivaId(l.id)}
            aria-pressed={activa?.id === l.id}
            className={`rounded-full border px-3.5 py-1.5 text-sm ${activa?.id === l.id ? "border-(--color-navigation) bg-(--color-navigation) font-medium text-white" : "bg-(--color-surface)"}`}
            style={activa?.id !== l.id ? { borderColor: "var(--color-border)" } : undefined}
          >
            {l.nombre} · {lugares.filter((p) => p.listaId === l.id).length}
          </button>
        ))}
        <button
          onClick={nuevaLista}
          className="flex items-center gap-1 rounded-full border border-dashed px-3.5 py-1.5 text-sm text-(--color-navigation)"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Plus size={14} aria-hidden="true" /> Nueva lista
        </button>
      </div>

      {!activa && (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-(--color-surface-muted) py-10 text-center">
          <Bookmark size={22} className="text-(--color-text-muted)" aria-hidden="true" />
          <p className="text-sm text-(--color-text-muted)">Aún no has guardado ningún sitio.</p>
          <p className="max-w-[260px] text-xs text-(--color-text-muted)">
            Toca el marcador en "Qué hay cerca" del mapa, o en cualquier resultado de búsqueda.
          </p>
        </div>
      )}

      {activa && (
        <>
          <div className="mb-3 flex gap-3">
            <button onClick={renombrar} className="flex items-center gap-1 text-xs text-(--color-navigation)">
              <Pencil size={13} aria-hidden="true" /> Renombrar
            </button>
            <button onClick={borrar} className="flex items-center gap-1 text-xs text-(--color-cancelled)">
              <Trash2 size={13} aria-hidden="true" /> Borrar lista
            </button>
          </div>

          {suyos.length === 0 && <p className="text-sm text-(--color-text-muted)">Esta lista está vacía.</p>}

          <ul className="space-y-2">
            {suyos.map((lugar) => (
              <li
                key={lugar.id}
                className="rounded-(--radius-card) border bg-(--color-surface) p-3 shadow-(--shadow-card)"
                style={{ borderColor: "var(--color-border)" }}
              >
                <p className="text-sm font-medium text-(--color-text)">{lugar.nombre}</p>
                {lugar.nota && <p className="mt-0.5 text-xs text-(--color-text-muted)">{lugar.nota}</p>}

                <div className="mt-2 flex flex-wrap gap-3">
                  <Accion icon={Plus} label="Añadir al viaje" onClick={() => anadirAlViaje(lugar)} />
                  <Accion icon={Navigation} label="Cómo llegar" onClick={() => openExternalUrl(googleMapsUrl(lugar.nombre, lugar.coordinates))} />
                  <Accion icon={FolderInput} label="Mover" onClick={() => mover(lugar)} />
                  <Accion icon={Trash2} label="Quitar" destructivo onClick={() => quitar(lugar.id)} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Accion({
  icon: Icon,
  label,
  onClick,
  destructivo,
}: {
  icon: typeof Plus;
  label: string;
  onClick: () => void;
  destructivo?: boolean;
}) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1 text-xs ${destructivo ? "text-(--color-cancelled)" : "text-(--color-navigation)"}`}>
      <Icon size={13} aria-hidden="true" /> {label}
    </button>
  );
}
