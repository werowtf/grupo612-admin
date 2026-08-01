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
  GASTO_TARJETA: "Gasto tarjeta",
  OTRO: "Otro",
};

/** Clases Tailwind (badge) por categoría. */
export const categoryBadge: Record<TxCategory, string> = {
  TRANSFERENCIA: "bg-info-bg text-info",
  CHEQUE: "bg-purple-50 text-purple-700",
  DEPOSITO: "bg-green-50 text-green-700",
  COMISION: "bg-warning-bg text-warning",
  GASTO_TARJETA: "bg-rose-50 text-rose-700",
  OTRO: "bg-gray-100 text-gray-600",
};

/** Color sólido por categoría, para barras y gráficas (mismo tono que el badge). */
export const categoryBar: Record<TxCategory, string> = {
  TRANSFERENCIA: "bg-[var(--color-info)]",
  CHEQUE: "bg-purple-500",
  DEPOSITO: "bg-brand-600",
  COMISION: "bg-[var(--color-warning)]",
  GASTO_TARJETA: "bg-rose-500",
  OTRO: "bg-gray-400",
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
