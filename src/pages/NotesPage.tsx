import { ArrowLeft, NotebookPen, Search, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTripStore } from "../stores/useTripStore";
import type { NoteTargetType } from "../types";

const TARGET_LABEL: Record<NoteTargetType, string> = {
  day: "Día",
  stop: "Parada",
  hotel: "Hotel",
  restaurant: "Restaurante",
  expense: "Gasto",
  photo: "Foto",
  vehicle: "Vehículo",
};

export function NotesPage() {
  const navigate = useNavigate();
  const notes = useTripStore((s) => s.notes);
  const stopsById = useTripStore((s) => s.stopsById);
  const trip = useTripStore((s) => s.trip);
  const updateNote = useTripStore((s) => s.updateNote);
  const deleteNote = useTripStore((s) => s.deleteNote);

  const [query, setQuery] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  function targetName(targetType: NoteTargetType, targetId: string): string {
    if (targetType === "stop") return stopsById[targetId]?.name ?? "Parada eliminada";
    if (targetType === "day") {
      const day = trip.days.find((d) => d.id === targetId);
      return day ? `Día ${day.index + 1} · ${day.title}` : "Día";
    }
    return TARGET_LABEL[targetType];
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter((n) => (onlyFavorites ? n.favorite : true))
      .filter((n) => (q ? n.text.toLowerCase().includes(q) || targetName(n.targetType, n.targetId).toLowerCase().includes(q) : true))
      .sort((a, b) => b.date.localeCompare(a.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, query, onlyFavorites, stopsById, trip.days]);

  return (
    <div className="safe-x h-full overflow-y-auto bg-(--color-bg) px-4 pt-4 pb-8">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-(--color-text-muted)">
        <ArrowLeft size={15} aria-hidden="true" /> Atrás
      </button>
      <h1 className="mb-3 text-xl font-bold">Notas del viaje</h1>

      <div className="mb-3 flex h-11 items-center gap-2 rounded-full border bg-(--color-surface) px-4" style={{ borderColor: "var(--color-border)" }}>
        <Search size={16} className="shrink-0 text-(--color-text-muted)" aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar en tus notas"
          aria-label="Buscar notas"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-(--color-text-muted)"
        />
      </div>

      <button
        onClick={() => setOnlyFavorites((v) => !v)}
        className={`mb-4 rounded-full border px-3.5 py-1.5 text-xs font-medium ${onlyFavorites ? "border-(--color-navigation) bg-(--color-navigation) text-white" : "bg-(--color-surface)"}`}
        style={!onlyFavorites ? { borderColor: "var(--color-border)" } : undefined}
      >
        Solo favoritas
      </button>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-(--radius-card) bg-(--color-surface-muted) py-10 text-center">
          <NotebookPen size={22} className="text-(--color-text-muted)" aria-hidden="true" />
          <p className="max-w-[250px] text-sm text-(--color-text-muted)">
            {notes.length === 0
              ? "Aún no has escrito ninguna nota. Puedes añadirlas desde la ficha de cada parada o desde el diario."
              : "Ninguna nota coincide con la búsqueda."}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((note) => (
          <article key={note.id} className="rounded-(--radius-card) border bg-(--color-surface) p-3.5 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-(--color-navigation)">{targetName(note.targetType, note.targetId)}</span>
                <span className="block text-[11px] text-(--color-text-muted)">{new Date(note.date).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <button onClick={() => updateNote(note.id, { favorite: !note.favorite })} aria-label={note.favorite ? "Quitar de favoritas" : "Marcar como favorita"}>
                  <Star size={16} className="text-(--color-gastronomy)" fill={note.favorite ? "currentColor" : "none"} aria-hidden="true" />
                </button>
                <button onClick={() => deleteNote(note.id)} aria-label="Eliminar nota">
                  <Trash2 size={15} className="text-(--color-cancelled)" aria-hidden="true" />
                </button>
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-(--color-text)">{note.text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
