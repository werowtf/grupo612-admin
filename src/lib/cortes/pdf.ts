import zlib from "node:zlib";

/**
 * Saca el texto de un PDF de corte generado por Soft Restaurant, sin llamar a
 * ningún servicio: el PDF trae el ticket como texto real (un operador de texto
 * por renglón), así que basta con descomprimir los streams de contenido y leer
 * las cadenas en orden.
 *
 * Solo sirve para PDFs de texto. Un PDF escaneado (una foto metida en un PDF)
 * no tiene cadenas de texto y devuelve pocas o ninguna línea; en ese caso hay
 * que caer al modelo de visión.
 */

/** Mínimo de renglones para dar por bueno el texto de un PDF. */
const MIN_LINEAS = 15;

/** Descomprime los streams del PDF y los concatena. */
function contentStreams(buf: Buffer): string {
  const parts: string[] = [];
  let i = 0;
  while (true) {
    const s = buf.indexOf("stream", i);
    if (s < 0) break;
    let start = s + "stream".length;
    if (buf[start] === 0x0d) start++;
    if (buf[start] === 0x0a) start++;
    const e = buf.indexOf("endstream", start);
    if (e < 0) break;
    const raw = buf.subarray(start, e);
    try {
      parts.push(zlib.inflateSync(raw).toString("latin1"));
    } catch {
      // Stream sin comprimir (o con un filtro que no manejamos): se intenta
      // leer tal cual; si es binario, simplemente no producirá texto.
      parts.push(raw.toString("latin1"));
    }
    i = e + "endstream".length;
  }
  return parts.join("\n");
}

/** Convierte los escapes de una cadena literal de PDF a texto. */
function decodePdfString(inner: string): string {
  return inner
    .replace(/\\([0-7]{1,3})/g, (_, oct: string) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, " ")
    .replace(/\\r/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\\([()\\])/g, "$1");
}

/**
 * Devuelve los renglones de texto del PDF, en orden de lectura, o `null` si el
 * PDF no trae texto extraíble (escaneado).
 */
export function extractPdfLines(buffer: Buffer): string[] | null {
  const content = contentStreams(buffer);
  const lines: string[] = [];

  // Cadenas seguidas del operador de mostrar texto: ' (siguiente línea), Tj y "
  const re = /\((?:\\.|[^\\()])*\)\s*(?:'|Tj|")/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    const literal = m[0].replace(/\s*(?:'|Tj|")$/, "");
    const text = decodePdfString(literal.slice(1, -1)).trimEnd();
    if (text.trim()) lines.push(text);
  }

  return lines.length >= MIN_LINEAS ? lines : null;
}
