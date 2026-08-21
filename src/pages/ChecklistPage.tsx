import { ArrowLeft, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTripStore } from "../stores/useTripStore";
import type { ChecklistCategory } from "../types";
import { percentage } from "../utils/format";

const CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  documentacion: "Documentación",
  vehiculo: "Vehículo",
  tecnologia: "Tecnología",
  viaje: "Viaje",
};

export function ChecklistPage() {
  const navigate = useNavigate();
  const checklist = useTripStore((s) => s.checklist);
  const toggleChecklistItem = useTripStore((s) => s.toggleChecklistItem);
  const addChecklistItem = useTripStore((s) => s.addChecklistItem);
  const removeChecklistItem = useTripStore((s) => s.removeChecklistItem);
  const restoreChecklistDefaults = useTripStore((s) => s.restoreChecklistDefaults);
  const [draft, setDraft] = useState("");
  const [category, setCategory] = useState<ChecklistCategory>("viaje");

  const completedPct = percentage(checklist.filter((c) => c.checked).length, checklist.length);

  return (
    <div className="safe-x h-full overflow-y-auto bg-(--color-bg) px-4 pt-4 pb-8">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-(--color-text-muted)">
        <ArrowLeft size={15} aria-hidden="true" /> Atrás
      </button>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-bold">Checklist</h1>
        <button onClick={restoreChecklistDefaults} className="flex items-center gap-1 text-xs text-(--color-text-muted)">
          <RotateCcw size={13} aria-hidden="true" /> Restaurar
        </button>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-(--color-surface-muted)">
        <div className="h-full bg-(--color-progress)" style={{ width: `${completedPct}%` }} />
      </div>

      {(Object.keys(CATEGORY_LABELS) as ChecklistCategory[]).map((cat) => (
        <div key={cat} className="mb-4">
          <p className="mb-1.5 text-xs font-semibold uppercase text-(--color-text-muted)">{CATEGORY_LABELS[cat]}</p>
          <div className="space-y-1.5">
            {checklist.filter((c) => c.category === cat).map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border bg-(--color-surface) px-3 py-2" style={{ borderColor: "var(--color-border)" }}>
                <label className="flex flex-1 items-center gap-2 text-sm">
                  <input type="checkbox" checked={item.checked} onChange={() => toggleChecklistItem(item.id)} className="h-4 w-4" />
                  <span className={item.checked ? "text-(--color-text-muted) line-through" : ""}>{item.label}</span>
                </label>
                {item.isCustom && (
                  <button onClick={() => removeChecklistItem(item.id)} aria-label="Eliminar">
                    <Trash2 size={14} className="text-(--color-cancelled)" aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-2 flex gap-2">
        <select value={category} onChange={(e) => setCategory(e.target.value as ChecklistCategory)} className="rounded-lg border px-2.5 py-2 text-sm" style={{ borderColor: "var(--color-border)" }}>
          {(Object.keys(CATEGORY_LABELS) as ChecklistCategory[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Nuevo elemento..." className="flex-1 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--color-border)" }} />
        <button
          onClick={() => {
            if (!draft.trim()) return;
            addChecklistItem(category, draft.trim());
            setDraft("");
          }}
          className="flex items-center gap-1 rounded-lg bg-(--color-navigation) px-3 py-2 text-sm font-semibold text-white"
        >
          <Plus size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
