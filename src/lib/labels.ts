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

/** Clases Tailwind (badge) por categoría. */
export const categoryBadge: Record<TxCategory, string> = {
  TRANSFERENCIA: "bg-info-bg text-info",
  CHEQUE: "bg-purple-bg text-purple",
  DEPOSITO: "bg-success-bg text-success",
  COMISION: "bg-warning-bg text-warning",
  GASTO_TARJETA: "bg-danger-bg text-danger",
};

/** Color sólido por categoría, para barras y gráficas (mismo tono que el badge). */
export const categoryBar: Record<TxCategory, string> = {
  TRANSFERENCIA: "bg-info",
  CHEQUE: "bg-purple",
  DEPOSITO: "bg-success",
  COMISION: "bg-warning",
  GASTO_TARJETA: "bg-danger",
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
