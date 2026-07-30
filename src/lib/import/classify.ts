import type { TxCategory, TxDirection } from "@/generated/prisma/enums";

/**
 * Clasifica un movimiento en una categoría contable a partir de su descripción
 * y dirección. Reglas ordenadas: la primera coincidencia gana. El resultado es
 * un "mejor esfuerzo" que el usuario puede corregir manualmente.
 *
 * Basado en el criterio de la contadora de Grupo 612 (Santander / BanBajío):
 * TRANSFERENCIA · CHEQUE · DEPOSITO · COMISION · COMPRA · OTRO.
 */
export function classifyTransaction(
  description: string,
  direction: TxDirection,
): TxCategory {
  // BanBajío concentra el detalle (fees, referencias) en una sola celda separada
  // por "|". El tipo real del movimiento está en el segmento principal, así que
  // clasificamos sobre él para no confundir un depósito con su comisión embebida.
  const primary = description.split("|")[0];
  const d = normalize(primary);

  // Abonos "de ajuste" que la contadora agrupa como depósito (contienen IVA/monto).
  if (/\bBONIF/.test(d) || /CAMBIO DE MONEDA/.test(d)) return "DEPOSITO";

  // Comisiones y cargos por servicio (incluye IVA de comisión).
  if (
    /COMISION|COMISION POR|\bIVA\b|TASA DE DESCUENTO|RENTA TERMINAL|MANEJO DE CUENTA|ANUALIDAD|EMISION DE CHEQUERA/.test(
      d,
    )
  ) {
    return "COMISION";
  }

  // Transferencias electrónicas (SPEI / traspasos).
  if (/SPEI|TRANSFEREN|TRASPASO|ENVIADO|INTERBANCARI/.test(d)) return "TRANSFERENCIA";

  // Cheques y documentos pagados (cámara / ventanilla / efectivo).
  if (/CHEQUE|CHEQUERA|DOC\.? PAGADO|DOCUMENTO PAGADO|PAGO CHEQUE|PGO CHEQUE|CAMARA|CAMARA DE COMP/.test(d)) {
    return "CHEQUE";
  }

  // Depósitos (ventas del día, negocios afiliados, depósito genérico).
  if (/DEPOSITO|NEGOCIOS AFIL|VENTAS DEL DIA/.test(d)) return "DEPOSITO";

  // Gasto con tarjeta: consumos/compras en comercios pagados con la tarjeta del negocio.
  if (/CONSUMO LOCAL|CONSUMO|COMPRA|PAGO A |DOMICILIAD|CARGO RECURRENTE|SUSCRIP|TARJETA DE DEBITO|TARJETA DE CREDITO/.test(d)) {
    return "GASTO_TARJETA";
  }

  // Sin coincidencia: los abonos se asumen depósitos; los cargos, otros.
  return direction === "ABONO" ? "DEPOSITO" : "OTRO";
}

/** Normaliza texto para comparar: mayúsculas y sin acentos. */
function normalize(s: string): string {
  return s
    .toUpperCase()
    .replace(/[ÁÀÂÄ]/g, "A")
    .replace(/[ÉÈÊË]/g, "E")
    .replace(/[ÍÌÎÏ]/g, "I")
    .replace(/[ÓÒÔÖ]/g, "O")
    .replace(/[ÚÙÛÜ]/g, "U")
    .replace(/Ñ/g, "N")
    .replace(/\s+/g, " ")
    .trim();
}
