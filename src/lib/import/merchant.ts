/**
 * Comercio / contraparte de un movimiento bancario, sacado de lo que trae el
 * estado de cuenta (no se guarda aparte: se deriva del texto del movimiento).
 *
 * - Compras con tarjeta: el comercio donde se pagó.
 *   · BanBajío: "Compra - Disposicion por POS por (738.52) mxn en MISC ZAPOPAN … | …"
 *   · Santander: columna Concepto, "CHEDRAUI 127 LA  LA PAZ BCS      6669402 …"
 * - Transferencias: beneficiario u ordenante (SPEI).
 * - Depósitos de terminal: comercio afiliado / afiliación.
 */
export interface MerchantInput {
  description: string;
  concept: string | null;
  counterpartyName: string | null;
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

export function txMerchant({ description, concept, counterpartyName }: MerchantInput): string | null {
  const desc = description ?? "";

  // BanBajío: compra en un comercio ("… mxn en NOMBRE | fecha RFC … Tarjeta …").
  const compra = /\bmxn en\s+(.+?)\s*\|/i.exec(desc);
  if (compra) return clean(compra[1]) || null;

  // BanBajío: SPEI enviado / recibido.
  const beneficiario = /Beneficiario:\s*(.+?)\s*(?:\(Dato no verificado|\|\s*Cuenta Beneficiario|Cuenta Beneficiario)/i.exec(desc);
  if (beneficiario) return clean(beneficiario[1]) || null;
  const ordenante = /Ordenante:\s*(.+?)\s*Cuenta Ordenante/i.exec(desc);
  if (ordenante) return clean(ordenante[1]) || null;

  // BanBajío: depósito de terminal ("… | COMERCIO AFILIADO | 9392402 | …").
  const afiliado = /COMERCIO AFILIADO\s*\|\s*(\d+)/i.exec(desc);
  if (afiliado) return `Comercio afiliado ${afiliado[1]}`;

  // Santander: contraparte de una transferencia.
  if (counterpartyName?.trim()) return clean(counterpartyName.replace(/^DEL CLIENTE\s+/i, ""));

  const c = concept?.trim();
  if (c) {
    // Afiliación de terminal: "AFIL.-008711023".
    const afil = /^AFIL\.?-?\s*(\d+)/i.exec(c);
    if (afil) return `Afiliación ${afil[1]}`;

    // Consumo con tarjeta: "COMERCIO  CIUDAD   folio   referencia…". Los bloques
    // separados por 2+ espacios; se quedan los de texto (comercio y ciudad) y se
    // descartan los puramente numéricos (folios y referencias).
    if (/CONSUMO/i.test(desc) || /\s{2,}/.test(c)) {
      const parts = c
        .split(/\s{2,}/)
        .map(clean)
        .filter((p) => p && !/^[\d\s]+$/.test(p) && !/^\d{6,}/.test(p));
      if (parts.length) return parts.slice(0, 2).join(" · ");
    }
  }
  return null;
}
