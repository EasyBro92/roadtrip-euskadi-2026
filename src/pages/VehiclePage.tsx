import { ArrowLeft, Fuel, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { VehicleService } from "../services/vehicle/VehicleService";
import { useTripStore } from "../stores/useTripStore";
import { formatEUR } from "../utils/format";

export function VehiclePage() {
  const navigate = useNavigate();
  const vehicle = useTripStore((s) => s.trip.vehicle);
  const refuels = useTripStore((s) => s.refuels);
  const updateVehicle = useTripStore((s) => s.updateVehicle);
  const addRefuel = useTripStore((s) => s.addRefuel);
  const deleteRefuel = useTripStore((s) => s.deleteRefuel);

  const stats = useMemo(() => VehicleService.computeStats(vehicle, refuels), [vehicle, refuels]);

  const [odometerKm, setOdometerKm] = useState("");
  const [liters, setLiters] = useState("");
  const [pricePerLiter, setPricePerLiter] = useState("");
  const [fullTank, setFullTank] = useState(true);
  const [place, setPlace] = useState("");

  function handleAddRefuel() {
    const km = Number.parseFloat(odometerKm);
    const l = Number.parseFloat(liters);
    const price = Number.parseFloat(pricePerLiter);
    if (!km || !l || !price) return;
    addRefuel({ vehicleId: vehicle.id, date: new Date().toISOString().slice(0, 10), place: place || "Sin especificar", odometerKm: km, liters: l, pricePerLiter: price, fullTank, notes: "" });
    setOdometerKm("");
    setLiters("");
    setPricePerLiter("");
    setPlace("");
  }

  return (
    <div className="safe-x h-full overflow-y-auto bg-(--color-bg) px-4 pt-4 pb-8">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-(--color-text-muted)">
        <ArrowLeft size={15} aria-hidden="true" /> Atrás
      </button>
      <h1 className="text-xl font-bold">Mi Golf</h1>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Field label="Modelo" value={`${vehicle.make} ${vehicle.model}`} onChange={() => {}} readOnly />
        <Field label="Motor" value={vehicle.engine} onChange={(v) => updateVehicle({ engine: v })} />
        <Field label="Matrícula" value={vehicle.plate ?? ""} onChange={(v) => updateVehicle({ plate: v })} placeholder="Opcional" />
        <Field label="Color" value={vehicle.color} onChange={(v) => updateVehicle({ color: v })} />
        <Field label="Depósito (L)" value={String(vehicle.tankCapacityLiters)} onChange={(v) => updateVehicle({ tankCapacityLiters: Number(v) || 0 })} type="number" />
        <Field label="Consumo medio (L/100km)" value={String(vehicle.averageConsumptionL100km)} onChange={(v) => updateVehicle({ averageConsumptionL100km: Number(v) || 0 })} type="number" />
        <Field label="Km iniciales" value={String(vehicle.odometerStartKm)} onChange={(v) => updateVehicle({ odometerStartKm: Number(v) || 0 })} type="number" />
        <Field label="Km finales" value={vehicle.odometerEndKm != null ? String(vehicle.odometerEndKm) : ""} onChange={(v) => updateVehicle({ odometerEndKm: v ? Number(v) : undefined })} type="number" placeholder="Al terminar" />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <StatBox label="Km totales" value={`${stats.totalKm} km`} />
        <StatBox label="Consumo real" value={stats.realConsumptionL100km ? `${stats.realConsumptionL100km.toFixed(1)} L/100km` : "—"} />
        <StatBox label="vs. 4.5 L/100km" value={stats.differenceVsBaselineL100km != null ? `${stats.differenceVsBaselineL100km > 0 ? "+" : ""}${stats.differenceVsBaselineL100km.toFixed(1)}` : "—"} />
        <StatBox label="Coste/km" value={stats.costPerKm != null ? `${stats.costPerKm.toFixed(2)} €` : "—"} />
        <StatBox label="Coste combustible" value={formatEUR(stats.totalFuelCost)} />
        <StatBox label="Autonomía estimada" value={stats.estimatedRangeKm ? `${Math.round(stats.estimatedRangeKm)} km` : "—"} />
      </div>

      <div className="mt-5 rounded-(--radius-card) border bg-(--color-surface) p-3 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-(--color-text-muted)">
          <Fuel size={14} aria-hidden="true" /> Registrar repostaje
        </p>
        <div className="flex flex-wrap gap-2">
          <input value={odometerKm} onChange={(e) => setOdometerKm(e.target.value)} type="number" placeholder="Km" className="w-20 rounded-lg border px-2.5 py-2 text-sm" style={{ borderColor: "var(--color-border)" }} />
          <input value={liters} onChange={(e) => setLiters(e.target.value)} type="number" placeholder="Litros" className="w-20 rounded-lg border px-2.5 py-2 text-sm" style={{ borderColor: "var(--color-border)" }} />
          <input value={pricePerLiter} onChange={(e) => setPricePerLiter(e.target.value)} type="number" step="0.001" placeholder="€/L" className="w-20 rounded-lg border px-2.5 py-2 text-sm" style={{ borderColor: "var(--color-border)" }} />
          <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Gasolinera" className="min-w-[100px] flex-1 rounded-lg border px-2.5 py-2 text-sm" style={{ borderColor: "var(--color-border)" }} />
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={fullTank} onChange={(e) => setFullTank(e.target.checked)} className="h-4 w-4" /> Depósito lleno
          </label>
          <button onClick={handleAddRefuel} className="flex items-center gap-1 rounded-lg bg-(--color-navigation) px-3 py-2 text-sm font-semibold text-white">
            <Plus size={14} aria-hidden="true" /> Añadir
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {[...refuels].reverse().map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-2 rounded-xl border bg-(--color-surface) p-2.5 text-sm" style={{ borderColor: "var(--color-border)" }}>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{r.place}</p>
              <p className="truncate text-xs text-(--color-text-muted)">{r.date} · {r.odometerKm} km · {r.liters} L</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="font-semibold">{formatEUR(r.totalCost)}</span>
              <button onClick={() => deleteRefuel(r.id)} className="text-xs text-(--color-cancelled)">
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", readOnly, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; readOnly?: boolean; placeholder?: string }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-medium text-(--color-text-muted)">{label}</span>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border px-2.5 py-2 text-sm"
        style={{ borderColor: "var(--color-border)" }}
      />
    </label>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-(--color-surface) p-2.5 text-center shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[10px] text-(--color-text-muted)">{label}</p>
    </div>
  );
}
