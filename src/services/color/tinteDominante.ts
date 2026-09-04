/**
 * El color de una foto, para teñir la tarjeta de ese viaje.
 *
 * En Google Wallet cada pase lleva el color de su marca, y es lo que hace que
 * reconozcas la tarjeta antes de leer nada. Aquí no hay marca, pero sí hay una
 * foto de portada: de ella sale el color.
 */
export interface Tinte {
  /** Grados en la rueda de color, 0-360. */
  h: number;
  /** Cuánto color tiene, 0-100. */
  s: number;
}

/**
 * Sólo el tono y la saturación, nunca el brillo.
 *
 * El brillo lo pone el diseño, no la foto. Si la foto decidiera también cuán
 * oscuro es el degradado, una portada de playa a mediodía dejaría el nombre
 * del viaje en blanco sobre casi blanco. Así la foto elige *qué* color, y la
 * tarjeta elige *cuán oscuro* — y el texto encima se lee siempre.
 */
const SATURACION_MINIMA = 45;
const SATURACION_MAXIMA = 70;

/** 24 cajones de 15°: suficiente para separar un mar de un bosque. */
const CAJONES = 24;

/* Píxeles que no dicen nada del color de la foto y sólo ensucian la media. */
const ALFA_MINIMA = 128;
const LUZ_MINIMA = 12;
const LUZ_MAXIMA = 92;
const GRIS_MAXIMO = 18;

export function rgbAHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l: l * 100 };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * El tono dominante de un mapa de píxeles RGBA.
 *
 * No es el color más repetido: es el más *presente*. Cada píxel pesa lo que
 * pesa su saturación, así que un trozo pequeño de mar intenso gana a media
 * foto de asfalto grisáceo — que es justo lo que recuerda el ojo de una foto,
 * y por tanto lo que hace reconocible la tarjeta.
 *
 * Devuelve `null` si la foto es realmente gris (niebla, blanco y negro): en
 * ese caso no hay color que sacar y quien llame usará el azul de la app, que
 * es mejor que inventarse un tono a partir de ruido.
 */
export function tinteDominante(pixeles: Uint8ClampedArray): Tinte | null {
  const peso = new Float64Array(CAJONES);
  const sen = new Float64Array(CAJONES);
  const cos = new Float64Array(CAJONES);
  /* Suma de s·s, para poder sacar la saturación media ponderada por sí misma. */
  const saturacionPonderada = new Float64Array(CAJONES);

  for (let i = 0; i + 3 < pixeles.length; i += 4) {
    if (pixeles[i + 3] < ALFA_MINIMA) continue;

    const { h, s, l } = rgbAHsl(pixeles[i], pixeles[i + 1], pixeles[i + 2]);
    if (l < LUZ_MINIMA || l > LUZ_MAXIMA || s < GRIS_MAXIMO) continue;

    const cajon = Math.min(CAJONES - 1, Math.floor((h / 360) * CAJONES));
    const radianes = (h * Math.PI) / 180;
    peso[cajon] += s;
    sen[cajon] += Math.sin(radianes) * s;
    cos[cajon] += Math.cos(radianes) * s;
    saturacionPonderada[cajon] += s * s;
  }

  let ganador = -1;
  for (let c = 0; c < CAJONES; c++) {
    if (peso[c] > 0 && (ganador === -1 || peso[c] > peso[ganador])) ganador = c;
  }
  if (ganador === -1) return null;

  /*
   * Media circular, no aritmética: los tonos son un círculo. Promediando 350°
   * y 10° "a pelo" sale 180° —verde— cuando los dos píxeles eran rojos.
   */
  let h = (Math.atan2(sen[ganador], cos[ganador]) * 180) / Math.PI;
  if (h < 0) h += 360;

  const sMedia = saturacionPonderada[ganador] / peso[ganador];
  const s = Math.min(SATURACION_MAXIMA, Math.max(SATURACION_MINIMA, sMedia));

  return { h: Math.round(h), s: Math.round(s) };
}
