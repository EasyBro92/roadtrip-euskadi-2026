import { describe, expect, it } from "vitest";
import { crc32, crearZip } from "../../src/services/export/zip";

const texto = (s: string) => new TextEncoder().encode(s);

async function bytesDe(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

/** Lee un entero little-endian, que es como el ZIP guarda todos los suyos. */
function leerU32(bytes: Uint8Array, en: number): number {
  return (bytes[en] | (bytes[en + 1] << 8) | (bytes[en + 2] << 16) | (bytes[en + 3] << 24)) >>> 0;
}
function leerU16(bytes: Uint8Array, en: number): number {
  return bytes[en] | (bytes[en + 1] << 8);
}

describe("crc32", () => {
  it("da el valor de referencia del estándar", () => {
    // "123456789" -> 0xCBF43926 es el vector de prueba clásico del CRC-32.
    expect(crc32(texto("123456789"))).toBe(0xcbf43926);
  });

  it("da cero para la entrada vacía", () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
  });

  it("cambia si cambia un solo byte", () => {
    expect(crc32(texto("hola"))).not.toBe(crc32(texto("hole")));
  });
});

describe("crearZip", () => {
  it("empieza por la firma de cabecera local", async () => {
    const bytes = await bytesDe(crearZip([{ nombre: "a.txt", datos: texto("hola") }]));
    expect(leerU32(bytes, 0)).toBe(0x04034b50);
  });

  it("termina con el fin de directorio central y el número de ficheros", async () => {
    const bytes = await bytesDe(
      crearZip([
        { nombre: "a.txt", datos: texto("uno") },
        { nombre: "b.txt", datos: texto("dos") },
      ]),
    );
    // Sin comentario final, el registro de fin son los últimos 22 bytes.
    const fin = bytes.length - 22;
    expect(leerU32(bytes, fin)).toBe(0x06054b50);
    expect(leerU16(bytes, fin + 10)).toBe(2);
  });

  it("apunta al directorio central en el sitio correcto", async () => {
    const bytes = await bytesDe(crearZip([{ nombre: "a.txt", datos: texto("hola") }]));
    const fin = bytes.length - 22;
    const inicioCentral = leerU32(bytes, fin + 16);

    // Ahí tiene que empezar de verdad una cabecera de directorio central.
    expect(leerU32(bytes, inicioCentral)).toBe(0x02014b50);
    expect(leerU32(bytes, fin + 12)).toBe(bytes.length - 22 - inicioCentral);
  });

  it("guarda los datos tal cual, sin comprimir", async () => {
    const contenido = texto("contenido reconocible");
    const bytes = await bytesDe(crearZip([{ nombre: "a.txt", datos: contenido }]));

    // Método de compresión 0 = guardado; y los bytes aparecen literales.
    expect(leerU16(bytes, 8)).toBe(0);
    const comoTexto = new TextDecoder().decode(bytes);
    expect(comoTexto).toContain("contenido reconocible");
  });

  it("anota el mismo tamaño comprimido y sin comprimir", async () => {
    const contenido = texto("doce bytes!!");
    const bytes = await bytesDe(crearZip([{ nombre: "a.txt", datos: contenido }]));

    expect(leerU32(bytes, 18)).toBe(contenido.length);
    expect(leerU32(bytes, 22)).toBe(contenido.length);
  });

  it("marca los nombres como UTF-8", async () => {
    // Sin el bit 11, "Sábado" se ve roto al abrirlo en Windows.
    const bytes = await bytesDe(crearZip([{ nombre: "Sábado/día 1.jpg", datos: texto("x") }]));
    expect(leerU16(bytes, 6) & 0x0800).toBe(0x0800);
  });

  it("convierte las barras invertidas en barras normales", async () => {
    const bytes = await bytesDe(crearZip([{ nombre: "dia-1\\foto.jpg", datos: texto("x") }]));
    expect(new TextDecoder().decode(bytes)).toContain("dia-1/foto.jpg");
  });

  it("crea un zip vacío válido cuando no hay nada que meter", async () => {
    const bytes = await bytesDe(crearZip([]));
    expect(bytes.length).toBe(22);
    expect(leerU32(bytes, 0)).toBe(0x06054b50);
    expect(leerU16(bytes, 10)).toBe(0);
  });
});
