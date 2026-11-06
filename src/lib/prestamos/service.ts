import "server-only";
import { prisma } from "@/lib/prisma";
import type { PaymentMethod } from "@/generated/prisma/enums";

export const CAT_PRESTAMO_OTORGADO = "Préstamo a negocio"; // egreso de quien presta
export const CAT_PRESTAMO_RECIBIDO = "Préstamo recibido"; // ingreso de quien recibe
export const CAT_REEMBOLSO = "Reembolso de préstamo"; // egreso de quien reembolsa / ingreso de quien cobra

export class PrestamoError extends Error {}

/** Día de hoy (yyyy-mm-dd) en la zona horaria del negocio. */
function hoy(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Mazatlan" });
}

/** Los movimientos del libro se guardan a mediodía del día (como el resto de los ingresos/egresos). */
function entryDate(day: string): Date {
  return new Date(`${day}T12:00:00`);
}

export interface CrearPrestamoInput {
  lenderVenueId: string;
  borrowerVenueId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  userId: string;
}

/**
 * Registra un préstamo entre negocios: egreso en el que presta e ingreso en el
 * que recibe, ambos por el mismo monto y forma de pago, en una sola transacción.
 */
export async function crearPrestamo(input: CrearPrestamoInput) {
  const { lenderVenueId, borrowerVenueId, paymentMethod, userId } = input;
  const amount = Math.round(input.amount * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) throw new PrestamoError("El monto debe ser mayor a cero.");
  if (lenderVenueId === borrowerVenueId) throw new PrestamoError("El negocio que presta y el que recibe deben ser distintos.");

  const venues = await prisma.venue.findMany({
    where: { id: { in: [lenderVenueId, borrowerVenueId] }, active: true },
    select: { id: true, name: true },
  });
  const lender = venues.find((v) => v.id === lenderVenueId);
  const borrower = venues.find((v) => v.id === borrowerVenueId);
  if (!lender || !borrower) throw new PrestamoError("Negocio no encontrado.");

  const day = hoy();
  const date = entryDate(day);

  return prisma.$transaction(async (tx) => {
    const lenderEntry = await tx.financialEntry.create({
      data: {
        venueId: lender.id,
        type: "EGRESO",
        date,
        amount,
        category: CAT_PRESTAMO_OTORGADO,
        description: `Préstamo a ${borrower.name}`,
        supplier: borrower.name,
        paymentMethod,
        source: "SISTEMA",
        createdById: userId,
      },
    });
    const borrowerEntry = await tx.financialEntry.create({
      data: {
        venueId: borrower.id,
        type: "INGRESO",
        date,
        amount,
        category: CAT_PRESTAMO_RECIBIDO,
        description: `Préstamo de ${lender.name}`,
        supplier: lender.name,
        paymentMethod,
        source: "SISTEMA",
        createdById: userId,
      },
    });
    return tx.prestamoNegocio.create({
      data: {
        date: new Date(`${day}T00:00:00.000Z`),
        amount,
        paymentMethod,
        lenderVenueId: lender.id,
        borrowerVenueId: borrower.id,
        lenderEntryId: lenderEntry.id,
        borrowerEntryId: borrowerEntry.id,
        createdById: userId,
      },
    });
  });
}

/**
 * Reembolsa un préstamo vigente: egreso en el negocio que había recibido e
 * ingreso en el que había prestado. El préstamo se "reclama" de forma atómica
 * antes de crear los movimientos, así un doble clic no los duplica.
 */
export async function reembolsarPrestamo(opts: { id: string; paymentMethod: PaymentMethod; userId: string }) {
  const { id, paymentMethod, userId } = opts;
  const day = hoy();
  const date = entryDate(day);

  return prisma.$transaction(async (tx) => {
    const claim = await tx.prestamoNegocio.updateMany({
      where: { id, status: "VIGENTE" },
      data: { status: "REEMBOLSADO", reimbursedAt: new Date(), reimbursePaymentMethod: paymentMethod, reimbursedById: userId },
    });
    if (claim.count === 0) {
      const exists = await tx.prestamoNegocio.findUnique({ where: { id }, select: { id: true } });
      throw new PrestamoError(exists ? "Este préstamo ya fue reembolsado." : "Préstamo no encontrado.");
    }

    const p = await tx.prestamoNegocio.findUniqueOrThrow({
      where: { id },
      include: { lenderVenue: { select: { name: true } }, borrowerVenue: { select: { name: true } } },
    });

    const borrowerRepay = await tx.financialEntry.create({
      data: {
        venueId: p.borrowerVenueId,
        type: "EGRESO",
        date,
        amount: p.amount,
        category: CAT_REEMBOLSO,
        description: `Reembolso a ${p.lenderVenue.name}`,
        supplier: p.lenderVenue.name,
        paymentMethod,
        source: "SISTEMA",
        createdById: userId,
      },
    });
    const lenderRepay = await tx.financialEntry.create({
      data: {
        venueId: p.lenderVenueId,
        type: "INGRESO",
        date,
        amount: p.amount,
        category: CAT_REEMBOLSO,
        description: `Reembolso de ${p.borrowerVenue.name}`,
        supplier: p.borrowerVenue.name,
        paymentMethod,
        source: "SISTEMA",
        createdById: userId,
      },
    });
    return tx.prestamoNegocio.update({
      where: { id },
      data: { borrowerRepayEntryId: borrowerRepay.id, lenderRepayEntryId: lenderRepay.id },
    });
  });
}
