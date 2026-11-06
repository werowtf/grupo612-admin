export interface CorteAmounts {
  pagoEfectivo: number;
  pagoOtros: number;
  totalFormasPago: number;
  totalVenta: number;
  propinaEfectivo: number;
  propinaVisa: number;
  propinaMastercard: number;
  propinaAmex: number;
  totalPropinas: number;
}

/**
 * Propinas cobradas con tarjeta. El ticket las suma a "Tarjeta" en su bloque de
 * caja porque ese dinero entra por la terminal (y llega al banco). Si el corte
 * no desglosa la propina por tarjeta, se usa el total de propinas menos la
 * parte en efectivo.
 */
export function propinasTarjeta(c: CorteAmounts): number {
  const desglosada = c.propinaVisa + c.propinaMastercard + c.propinaAmex;
  if (desglosada > 0) return desglosada;
  return Math.max(0, c.totalPropinas - c.propinaEfectivo);
}

/**
 * Efectivo / tarjeta / crédito de la venta diaria a partir de los cortes del día
 * (ya sumados). Tarjeta = lo cobrado con tarjeta + las propinas con tarjeta;
 * crédito = "Otros" + lo vendido y no cobrado.
 */
export function splitFormasPago(c: CorteAmounts) {
  return {
    efectivo: c.pagoEfectivo,
    tarjeta: Math.max(0, c.totalFormasPago - c.pagoEfectivo - c.pagoOtros) + propinasTarjeta(c),
    credito: c.pagoOtros + Math.max(0, c.totalVenta - c.totalFormasPago),
  };
}
