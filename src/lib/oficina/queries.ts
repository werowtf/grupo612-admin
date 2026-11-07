import "server-only";
import { prisma } from "@/lib/prisma";

function num(v: { toString(): string } | null | undefined): number {
  return v ? Number(v.toString()) : 0;
}

/** Clave del tramo que reúne lo anterior al primer periodo registrado. */
export const PERIODO_INICIAL = "inicial";

/** Un tramo de la caja chica de Oficina: un periodo con su fondo fijo, o el periodo inicial (sin fondo fijo). */
export interface PeriodoSegmento {
  key: string; // id del periodo, o PERIODO_INICIAL
  id: string | null;
  /** Inicio (incluido); null = desde siempre (periodo inicial). */
  start: Date | null;
  /** Fin (excluido) = inicio del siguiente periodo; null = sigue abierto. */
  end: Date | null;
  /** Fondo fijo autorizado; null en el periodo inicial (ahí el fondo es la suma de fondos aprobados). */
  fondoFijo: number | null;
  notes: string | null;
  vigente: boolean;
}

/**
 * Caja chica propia de Oficina (independiente de la de los negocios), por periodos.
 * Sin periodos registrados todo es un solo tramo; con periodos, el vigente es el más
 * reciente y lo anterior queda en tramos cerrados que sólo se consultan.
 */
export async function getOficinaCajaChica(periodoKey?: string) {
  const periodos = await prisma.oficinaCajaChicaPeriodo.findMany({ orderBy: { startDate: "asc" } });

  const segmentos: PeriodoSegmento[] = [];
  segmentos.push({
    key: PERIODO_INICIAL,
    id: null,
    start: null,
    end: periodos[0]?.startDate ?? null,
    fondoFijo: null,
    notes: null,
    vigente: periodos.length === 0,
  });
  periodos.forEach((p, i) => {
    segmentos.push({
      key: p.id,
      id: p.id,
      start: p.startDate,
      end: periodos[i + 1]?.startDate ?? null,
      fondoFijo: num(p.fondoFijo),
      notes: p.notes,
      vigente: i === periodos.length - 1,
    });
  });
  // Más reciente primero (para el selector).
  segmentos.reverse();

  const seleccionado = segmentos.find((s) => s.key === periodoKey) ?? segmentos[0];
  const range = {
    ...(seleccionado.start || seleccionado.end
      ? { date: { ...(seleccionado.start ? { gte: seleccionado.start } : {}), ...(seleccionado.end ? { lt: seleccionado.end } : {}) } }
      : {}),
  };

  const [fondos, gastos] = await Promise.all([
    prisma.oficinaCajaChicaFondo.findMany({ where: range, orderBy: { date: "desc" } }),
    prisma.oficinaCajaChicaGasto.findMany({
      where: range,
      orderBy: { date: "desc" },
      include: { venue: { select: { name: true } } },
    }),
  ]);

  // Con fondo fijo, el fondo es el autorizado del periodo; sin él, la suma de fondos aprobados.
  const fondoTotal = seleccionado.fondoFijo ?? fondos.reduce((s, f) => s + num(f.amount), 0);
  const gastadoTotal = gastos.reduce((s, g) => (g.reimbursed ? s : s + num(g.amount)), 0);
  const reembolsadoTotal = gastos.reduce((s, g) => (g.reimbursed ? s + num(g.amount) : s), 0);

  return {
    segmentos,
    seleccionado,
    resumen: { fondoTotal, gastadoTotal, reembolsadoTotal, disponible: fondoTotal - gastadoTotal },
    fondos,
    gastos,
  };
}

export async function getOficinaNotas() {
  return prisma.oficinaNota.findMany({
    orderBy: { updatedAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });
}
