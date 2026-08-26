/**
 * Escritor de ZIP mínimo, sin comprimir (método "stored").
 *
 * Se escribe a mano en vez de traer una librería porque lo único que metemos
 * dentro son JPEG, que ya vienen comprimidos: pasarles deflate encima gasta
 * tiempo de CPU del móvil para ahorrar prácticamente nada. Sin compresión el
 * formato cabe en un fichero y no añade dependencias.
 *
 * Cubre lo que necesitamos y nada más: sin cifrado, sin Zip64 (el límite son
 * 4 GB y 65.535 ficheros) y sin carpetas vacías. Los nombres van en UTF-8 con
 * el bit 11 activado, que es lo que hace que "Sábado día 1/girona.jpg" se lea
 * bien en Windows.
 */

export interface EntradaZip {
  /** Ruta dentro del ZIP. La barra `/` crea carpetas. */
  nombre: string;
  datos: Uint8Array;
  fecha?: Date;
}

const FIRMA_LOCAL = 0x04034b50;
const FIRMA_CENTRAL = 0x02014b50;
const FIRMA_FIN = 0x06054b50;

/** Bit 11: los nombres van en UTF-8, no en la tabla de códigos del sistema. */
const BANDERA_UTF8 = 0x0800;

const TABLA_CRC = (() => {
  const tabla = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let bit = 0; bit < 8; bit++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    tabla[i] = c >>> 0;
  }
  return tabla;
})();

/** CRC-32 (el del ZIP y el de PNG: polinomio IEEE 802.3, reflejado). */
export function crc32(datos: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < datos.length; i++) {
    c = TABLA_CRC[(c ^ datos[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** Fecha y hora en el formato de MS-DOS que exige el ZIP (segundos en pasos de 2). */
function fechaDos(fecha: Date): { hora: number; dia: number } {
  const anio = Math.max(1980, fecha.getFullYear());
  return {
    hora: (fecha.getHours() << 11) | (fecha.getMinutes() << 5) | (fecha.getSeconds() >> 1),
    dia: ((anio - 1980) << 9) | ((fecha.getMonth() + 1) << 5) | fecha.getDate(),
  };
}

/** Escritor secuencial de enteros pequeños en little-endian, que es como los guarda el ZIP. */
class Bloque {
  private bytes: number[] = [];

  u16(valor: number): this {
    this.bytes.push(valor & 0xff, (valor >>> 8) & 0xff);
    return this;
  }

  u32(valor: number): this {
    this.bytes.push(valor & 0xff, (valor >>> 8) & 0xff, (valor >>> 16) & 0xff, (valor >>> 24) & 0xff);
    return this;
  }

  bytesFinales(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}

interface Preparada {
  nombreBytes: Uint8Array;
  datos: Uint8Array;
  crc: number;
  hora: number;
  dia: number;
  desplazamiento: number;
}

/**
 * Arma el ZIP: cada fichero con su cabecera local, y al final el directorio
 * central, que es lo que de verdad usan los descompresores para listar.
 */
export function crearZip(entradas: EntradaZip[]): Blob {
  const codificador = new TextEncoder();
  const trozos: BlobPart[] = [];
  const preparadas: Preparada[] = [];
  let desplazamiento = 0;

  for (const entrada of entradas) {
    // Las rutas del ZIP siempre usan `/`, incluso las creadas en Windows.
    const nombreBytes = codificador.encode(entrada.nombre.replace(/\\/g, "/"));
    const crc = crc32(entrada.datos);
    const { hora, dia } = fechaDos(entrada.fecha ?? new Date());

    const cabecera = new Bloque()
      .u32(FIRMA_LOCAL)
      .u16(20) // versión mínima para extraer: 2.0
      .u16(BANDERA_UTF8)
      .u16(0) // método 0 = guardado tal cual
      .u16(hora)
      .u16(dia)
      .u32(crc)
      .u32(entrada.datos.length) // comprimido
      .u32(entrada.datos.length) // sin comprimir: al no comprimir, el mismo
      .u16(nombreBytes.length)
      .u16(0) // sin campo extra
      .bytesFinales();

    trozos.push(cabecera, nombreBytes, entrada.datos);
    preparadas.push({ nombreBytes, datos: entrada.datos, crc, hora, dia, desplazamiento });
    desplazamiento += cabecera.length + nombreBytes.length + entrada.datos.length;
  }

  const inicioCentral = desplazamiento;
  let tamanoCentral = 0;

  for (const p of preparadas) {
    const central = new Bloque()
      .u32(FIRMA_CENTRAL)
      .u16(20) // versión con la que se creó
      .u16(20) // versión mínima para extraer
      .u16(BANDERA_UTF8)
      .u16(0)
      .u16(p.hora)
      .u16(p.dia)
      .u32(p.crc)
      .u32(p.datos.length)
      .u32(p.datos.length)
      .u16(p.nombreBytes.length)
      .u16(0) // extra
      .u16(0) // comentario
      .u16(0) // número de disco
      .u16(0) // atributos internos
      .u32(0) // atributos externos
      .u32(p.desplazamiento)
      .bytesFinales();

    trozos.push(central, p.nombreBytes);
    tamanoCentral += central.length + p.nombreBytes.length;
  }

  const fin = new Bloque()
    .u32(FIRMA_FIN)
    .u16(0) // disco actual
    .u16(0) // disco donde empieza el directorio
    .u16(preparadas.length)
    .u16(preparadas.length)
    .u32(tamanoCentral)
    .u32(inicioCentral)
    .u16(0) // sin comentario
    .bytesFinales();

  trozos.push(fin);
  return new Blob(trozos, { type: "application/zip" });
}
