import type { TxCategory, TxDirection } from "@/generated/prisma/enums";

/**
 * Clasifica un movimiento en una categoría contable a partir de su descripción
 * y dirección. Reglas ordenadas: la primera coincidencia gana. El resultado es
 * un "mejor esfuerzo" que el usuario puede corregir manualmente.
 *
 * Basado en el criterio de la contadora de Grupo 612 (Santander / BanBajío):
 * TRANSFERENCIA · CHEQUE · DEPOSITO · COMISION · TARJETA. El estado de cuenta
 * es el de la tarjeta del negocio, así que ya no existe una categoría "Otro":
 * lo que no calce con una regla más específica se clasifica como TARJETA.
 */
export function classifyTransaction(
  description: string,
  direction: TxDirection,
): TxCategory {
  return classifyWithMatch(description, direction).category;
}

export interface Classification {
  category: TxCategory;
  /**
   * `false` cuando ninguna regla reconoció el concepto y se cayó al criterio
   * por defecto. Los bancos cambian la redacción de un mes a otro, así que
   * conviene avisar al importar en vez de dar por buena la categoría: así fue
   * como "CGO IMPTO FED TRANSF ELECT" ($210,548) terminó como gasto con
   * tarjeta sin que nadie lo notara.
   */
  matched: boolean;
}

/** Igual que {@link classifyTransaction}, pero indica si alguna regla casó. */
export function classifyWithMatch(
  description: string,
  direction: TxDirection,
): Classification {
  // BanBajío concentra el detalle (fees, referencias) en una sola celda separada
  // por "|". El tipo real del movimiento está en el segmento principal, así que
  // clasificamos sobre él para no confundir un depósito con su comisión embebida.
  const primary = description.split("|")[0];
  const d = normalize(primary);
  const hit = (category: TxCategory): Classification => ({ category, matched: true });

  // BanBajío reutiliza el mismo texto ("Negocios Afiliados", "para depósito
  // en la cuenta...") tanto para depósitos reales como para retiros — hay que
  // distinguirlos por el verbo antes de llegar a la regla de depósito, o un
  // retiro (cargo) se cuela como si fuera dinero entrando.
  if (/^RETIRO/.test(d) && /NEGOCIOS AFIL/.test(d)) return hit("GASTO_TARJETA");
  if (/^RETIRO DE RECURSOS/.test(d)) return hit("TRANSFERENCIA");

  // Abonos "de ajuste" que la contadora agrupa como depósito (contienen IVA/monto).
  if ((/\bBONIF/.test(d) || /CAMBIO DE MONEDA/.test(d) || /AJUSTE ABONO/.test(d)) && direction === "ABONO") {
    return hit("DEPOSITO");
  }

  // Depósito de ventas del día que el banco canceló/revirtió: la contadora lo
  // trata como comisión, no como depósito real, así que va antes de la regla
  // general de depósito (más abajo) para que gane sobre ella.
  if (/CANCEL.*DEPOSITO/.test(d)) return hit("COMISION");

  // Comisiones y cargos por servicio (incluye IVA de comisión). Ojo con los
  // límites de palabra: sin \b, ANUALIDAD casa dentro de "MANUALIDADES" y
  // manda una compra en un comercio a Comisión.
  if (
    /COMISION|COMISION POR|\bIVA\b|TASA DE DESCUENTO|RENTA TERMINAL|ADMINISTRACION RENTA|MANEJO DE CUENTA|\bANUALIDAD|EMISION DE CHEQUERA/.test(
      d,
    )
  ) {
    return hit("COMISION");
  }

  // Transferencias electrónicas (SPEI / traspasos), incluido el pago de
  // impuestos federales por transferencia electrónica. Una transferencia
  // recibida es dinero que entra, y la contadora la cuenta como depósito:
  // "Transferencia" agrupa solo las salidas.
  if (/SPEI|TRANSFEREN|TRASPASO|ENVIADO|INTERBANCARI|IMPTO FED|IMPUESTO FED/.test(d)) {
    return hit(direction === "ABONO" ? "DEPOSITO" : "TRANSFERENCIA");
  }

  // Cheques y documentos pagados (cámara / ventanilla / efectivo).
  if (/CHEQUE|CHEQUERA|DOC\.? PAGADO|DOCUMENTO PAGADO|PAGO CHEQUE|PGO CHEQUE|CAMARA|CAMARA DE COMP/.test(d)) {
    return hit("CHEQUE");
  }

  // Depósitos (ventas del día, negocios afiliados, depósito genérico). Un
  // depósito real siempre es un abono; si un cargo cae aquí por el texto,
  // es un retiro mal etiquetado por el banco, no un depósito.
  if (/DEPOSITO|NEGOCIOS AFIL|VENTAS DEL DIA/.test(d) && direction === "ABONO") return hit("DEPOSITO");

  // Gasto con tarjeta: consumos/compras en comercios pagados con la tarjeta del negocio.
  if (
    /CONSUMO LOCAL|CONSUMO|COMPRA|PAGO A |DOMICILIA|CARGO RECURRENTE|SUSCRIP|TARJETA DE DEBITO|TARJETA DE CREDITO|CONTRACARGO/.test(
      d,
    )
  ) {
    return hit("GASTO_TARJETA");
  }

  // Sin coincidencia: los abonos se asumen depósitos; los cargos, tarjeta.
  return {
    category: direction === "ABONO" ? "DEPOSITO" : "GASTO_TARJETA",
    matched: false,
  };
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
