import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { SwipeToDelete } from "../../components/SwipeToDelete";
import type { TripSummary } from "../../stores/useTripStore";
import { TarjetaViaje } from "./TarjetaViaje";

/** Cuánto asoma por abajo cada tarjeta de las de atrás. */
const ASOMA = 16;
/** Cuántos bordes se dibujan detrás como mucho: más es una baraja, no una pila. */
const BORDES = 2;

/**
 * Los viajes terminados, apilados como las tarjetas guardadas de Wallet.
 *
 * La pila de Wallet funciona porque tienes veinte pases y sólo uno importa
 * ahora. Aquí pasa lo mismo con los viajes que ya hiciste: siguen estando,
 * quieres poder abrirlos, pero no deben competir por la pantalla con el que
 * tienes en marcha. Cerrada, la pila ocupa poco más que una tarjeta.
 *
 * Cerrada, lo de atrás son bordes dibujados, no tarjetas de verdad: si fueran
 * botones reales quedarían debajo de otro botón, alcanzables con el teclado
 * pero invisibles, y un dedo que roza el borde abriría un viaje sin querer.
 */
export function PilaDeViajes({
  viajes,
  alAbrir,
  alBorrar,
}: {
  viajes: TripSummary[];
  alAbrir: (id: string, activo: boolean) => void;
  alBorrar: (id: string, nombre: string) => void;
}) {
  const [abierta, setAbierta] = useState(false);

  if (viajes.length === 0) return null;

  const bordes = Math.min(BORDES, viajes.length - 1);

  return (
    <section className="mt-6">
      <button
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        className="mb-2 flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-semibold text-(--color-text)">
          Viajes terminados
          <span className="ml-1.5 font-normal text-(--color-text-muted)">{viajes.length}</span>
        </span>
        <ChevronDown
          size={18}
          className={`text-(--color-text-muted) transition-transform duration-300 ${abierta ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {abierta ? (
        <ul className="flex flex-col gap-3">
          {viajes.map((v) => (
            <li key={v.id}>
              <SwipeToDelete deleteLabel={`Borrar el viaje ${v.name}`} onDelete={() => alBorrar(v.id, v.name)} radio="rounded-(--radius-card)">
                <TarjetaViaje viaje={v} alAbrir={() => alAbrir(v.id, v.isActive)} alto="h-36" />
              </SwipeToDelete>
            </li>
          ))}
        </ul>
      ) : (
        <div className="relative">
          {/*
           * Los bordes van detrás y un poco más estrechos, que es lo que hace
           * leer "hay más debajo" en vez de "esta tarjeta tiene una sombra
           * rara". Se dibujan de atrás hacia delante.
           */}
          {Array.from({ length: bordes }, (_, i) => {
            const profundidad = bordes - i;
            return (
              <div
                key={i}
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-36 rounded-(--radius-card) border bg-(--color-surface) shadow-(--shadow-card)"
                style={{
                  borderColor: "var(--color-border)",
                  transform: `translateY(${profundidad * ASOMA}px) scaleX(${1 - profundidad * 0.04})`,
                }}
              />
            );
          })}

          <div className="relative">
            <SwipeToDelete deleteLabel={`Borrar el viaje ${viajes[0].name}`} onDelete={() => alBorrar(viajes[0].id, viajes[0].name)} radio="rounded-(--radius-card)">
              <TarjetaViaje viaje={viajes[0]} alAbrir={() => alAbrir(viajes[0].id, viajes[0].isActive)} alto="h-36" />
            </SwipeToDelete>
          </div>

          {/* El hueco que ocupan los bordes que asoman, para que lo de debajo
              no se les monte encima. */}
          <div style={{ height: bordes * ASOMA }} aria-hidden="true" />
        </div>
      )}
    </section>
  );
}
