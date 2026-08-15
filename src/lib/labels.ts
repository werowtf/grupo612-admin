import type {
  UserRole,
  TxCategory,
  TxStatus,
  TxDirection,
  Bank,
  DocumentCategory,
} from "@/generated/prisma/enums";

export const roleLabels: Record<UserRole, string> = {
  ADMIN: "Administrador",
  GERENTE: "Gerente",
  CONTADOR: "Contabilidad",
  CONTADOR_EXTERNO: "Contabilidad externa",
  COMPRAS: "Compras",
  CAJERO: "Cajero",
};

export const categoryLabels: Record<TxCategory, string> = {
  TRANSFERENCIA: "Transferencia",
  CHEQUE: "Cheque",
  DEPOSITO: "Depósito",
  COMISION: "Comisión",
  GASTO_TARJETA: "Tarjeta",
};

/** Clases Tailwind (badge) por categoría — mismo tono para todas (chart-1). */
export const categoryBadge: Record<TxCategory, string> = {
  DEPOSITO: "bg-chart-1/15 text-chart-1",
  TRANSFERENCIA: "bg-chart-1/15 text-chart-1",
  COMISION: "bg-chart-1/15 text-chart-1",
  CHEQUE: "bg-chart-1/15 text-chart-1",
  GASTO_TARJETA: "bg-chart-1/15 text-chart-1",
};

/** Color sólido por categoría, para barras y gráficas (mismo tono que el badge). */
export const categoryBar: Record<TxCategory, string> = {
  DEPOSITO: "bg-chart-1",
  TRANSFERENCIA: "bg-chart-2",
  COMISION: "bg-chart-3",
  CHEQUE: "bg-chart-4",
  GASTO_TARJETA: "bg-chart-5",
};

export const statusLabels: Record<TxStatus, string> = {
  PENDIENTE: "Pendiente",
  CONCILIADO: "Conciliado",
  IGNORADO: "Ignorado",
};

export const directionLabels: Record<TxDirection, string> = {
  CARGO: "Cargo",
  ABONO: "Abono",
};

export const bankLabels: Record<Bank, string> = {
  SANTANDER: "Santander",
  BANBAJIO: "BanBajío",
  OTRO: "Otro",
};

export const documentCategoryLabels: Record<DocumentCategory, string> = {
  FACTURA: "Factura",
  CONTRATO: "Contrato",
  COMPROBANTE: "Comprobante",
  IDENTIFICACION: "Identificación",
  ACTA_CONSTITUTIVA: "Acta constitutiva",
  PERMISO: "Permiso / Licencia",
  RECIBO: "Recibo",
  OTRO: "Otro",
};

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  "FACTURA",
  "CONTRATO",
  "COMPROBANTE",
  "IDENTIFICACION",
  "ACTA_CONSTITUTIVA",
  "PERMISO",
  "RECIBO",
  "OTRO",
];
