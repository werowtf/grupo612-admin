import type { CorteSource } from "@/generated/prisma/enums";

/**
 * Borrador de corte extraído de un archivo o foto. Todos los campos son
 * opcionales: la extracción es "mejor esfuerzo" y el usuario revisa/edita
 * antes de guardar.
 */
export interface CorteDraft {
  date?: string; // ISO yyyy-mm-dd
  turno?: string;
  cajera?: string;
  estacion?: string;
  folioCorteZ?: string;
  folioInicial?: string;
  folioFinal?: string;

  pagoEfectivo?: number;
  pagoVisa?: number;
  pagoMastercard?: number;
  pagoAmex?: number;
  pagoVales?: number;
  pagoOtros?: number;
  totalFormasPago?: number;

  propinaEfectivo?: number;
  propinaVisa?: number;
  propinaMastercard?: number;
  propinaAmex?: number;
  totalPropinas?: number;

  ventaAlimentos?: number;
  ventaBebidas?: number;
  ventaOtros?: number;

  subtotal?: number;
  descuentos?: number;
  ventaNeta?: number;
  iva?: number;
  totalVenta?: number;

  efectivoInicial?: number;
  efectivoDeclarado?: number;
  retiros?: number;
  depositos?: number;
  sobranteFaltante?: number;

  cuentasNormales?: number;
  cuentasCanceladas?: number;
  comensales?: number;
  cuentaPromedio?: number;
}

export interface CorteExtraction {
  source: CorteSource;
  draft: CorteDraft;
  rawText?: string;
  raw?: Record<string, unknown>;
  /** Campos que sí se pudieron detectar (para resaltar en la revisión). */
  detected: (keyof CorteDraft)[];
}
