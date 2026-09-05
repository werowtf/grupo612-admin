import type { CorteDraft } from "./types";

export type FieldType = "money" | "int" | "text" | "date";

export interface CorteField {
  key: keyof CorteDraft;
  label: string;
  type: FieldType;
}

export interface CorteSectionDef {
  title: string;
  fields: CorteField[];
}

export const CORTE_SECTIONS: CorteSectionDef[] = [
  {
    title: "Identificación",
    fields: [
      { key: "date", label: "Fecha", type: "date" },
      { key: "turno", label: "Turno", type: "text" },
      { key: "cajera", label: "Cajera / responsable", type: "text" },
      { key: "estacion", label: "Estación", type: "text" },
      { key: "folioCorteZ", label: "Folio Corte Z", type: "text" },
      { key: "folioInicial", label: "Folio inicial", type: "text" },
      { key: "folioFinal", label: "Folio final", type: "text" },
    ],
  },
  {
    title: "Formas de pago (ventas)",
    fields: [
      { key: "pagoEfectivo", label: "Efectivo", type: "money" },
      { key: "pagoVisa", label: "Visa", type: "money" },
      { key: "pagoMastercard", label: "Mastercard", type: "money" },
      { key: "pagoAmex", label: "American Express", type: "money" },
      { key: "pagoVales", label: "Vales", type: "money" },
      { key: "pagoOtros", label: "Otros", type: "money" },
      { key: "totalFormasPago", label: "Total formas de pago", type: "money" },
    ],
  },
  {
    title: "Propinas",
    fields: [
      { key: "propinaEfectivo", label: "Efectivo", type: "money" },
      { key: "propinaVisa", label: "Visa", type: "money" },
      { key: "propinaMastercard", label: "Mastercard", type: "money" },
      { key: "propinaAmex", label: "American Express", type: "money" },
      { key: "totalPropinas", label: "Total propinas", type: "money" },
    ],
  },
  {
    title: "Ventas por producto",
    fields: [
      { key: "ventaAlimentos", label: "Alimentos", type: "money" },
      { key: "ventaBebidas", label: "Bebidas", type: "money" },
      { key: "ventaOtros", label: "Otros", type: "money" },
    ],
  },
  {
    title: "Ventas por terminal",
    fields: [
      { key: "ventaTerminalBanbajio", label: "Banbajio", type: "money" },
      { key: "ventaTerminalPayefy", label: "Payefy", type: "money" },
      { key: "ventaTerminalWuzi", label: "Wuzi", type: "money" },
    ],
  },
  {
    title: "Propinas por pagar",
    fields: [{ key: "propinasPorPagar", label: "Monto", type: "money" }],
  },
  {
    title: "Totales",
    fields: [
      { key: "subtotal", label: "Subtotal", type: "money" },
      { key: "descuentos", label: "Descuentos", type: "money" },
      { key: "ventaNeta", label: "Venta neta", type: "money" },
      { key: "iva", label: "IVA", type: "money" },
      { key: "totalVenta", label: "Total con impuestos", type: "money" },
    ],
  },
  {
    title: "Control de caja",
    fields: [
      { key: "efectivoInicial", label: "Efectivo inicial", type: "money" },
      { key: "efectivoDeclarado", label: "Efectivo declarado / final", type: "money" },
      { key: "retiros", label: "Retiros", type: "money" },
      { key: "depositos", label: "Depósitos", type: "money" },
      { key: "sobranteFaltante", label: "Sobrante (+) / Faltante (−)", type: "money" },
    ],
  },
  {
    title: "Operación",
    fields: [
      { key: "cuentasNormales", label: "Cuentas normales", type: "int" },
      { key: "cuentasCanceladas", label: "Cuentas canceladas", type: "int" },
      { key: "comensales", label: "Comensales", type: "int" },
      { key: "cuentaPromedio", label: "Cuenta promedio", type: "money" },
    ],
  },
];

export const ALL_CORTE_FIELDS: CorteField[] = CORTE_SECTIONS.flatMap((s) => s.fields);

export const MONEY_KEYS = ALL_CORTE_FIELDS.filter((f) => f.type === "money").map(
  (f) => f.key,
);
export const INT_KEYS = ALL_CORTE_FIELDS.filter((f) => f.type === "int").map((f) => f.key);
export const TEXT_KEYS = ALL_CORTE_FIELDS.filter(
  (f) => f.type === "text" || f.type === "date",
).map((f) => f.key);
