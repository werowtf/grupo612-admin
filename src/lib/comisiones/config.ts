/**
 * Porcentaje de comisión para la Nómina Administrativa, por negocio (slug).
 * Se calcula sobre la venta total del mes, como en el libro contable
 * ("NOMINA ADMINISTRACIÓN" = total de ventas × porcentaje). Los negocios que no
 * están aquí (p. ej. Comisariato) no generan comisión.
 */
export const COMISION_NOMINA_ADMIN: Record<string, number> = {
  "612rooftop": 0.07,
  unobar: 0.05,
  biznaga: 0.05,
};
