import Link from "next/link";
import { Settings } from "lucide-react";
import { getAppContext } from "@/lib/context";
import {
  getCafeterias,
  getProductosCafeteria,
  getPedidosMes,
  getFacturaMes,
  getPedidosMesTodos,
  IVA_RATE,
} from "@/lib/pedidos/queries";
import { PedidosGrid } from "@/components/pedidos-grid";
import { PedidosResumen } from "@/components/pedidos-resumen";
import { MonthPicker } from "@/components/month-picker";

function parseMonth(raw: string | undefined): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(raw ?? "");
  if (m) return { year: Number(m[1]), month: Number(m[2]) };
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; cafe?: string }>;
}) {
  const { selected } = await getAppContext();
  const sp = await searchParams;

  if (!selected) {
    return (
      <div className="card p-10 text-center text-sm text-muted-foreground">
        Tu usuario no tiene negocios asignados.
      </div>
    );
  }

  if (selected.slug !== "comisariato") {
    return (
      <div className="card p-10 text-center text-sm text-muted-foreground">
        Los pedidos de cafetería son exclusivos de Comisariato. Cambia de negocio en el menú de arriba.
      </div>
    );
  }

  const cafeterias = await getCafeterias(selected.id);
  if (cafeterias.length === 0) {
    return (
      <div className="card p-10 text-center text-sm text-muted-foreground">
        No hay cafés registrados todavía. Agrégalos en{" "}
        <Link href="/pedidos/productos" className="text-brand-600 underline">
          Productos
        </Link>
        .
      </div>
    );
  }

  const isTodos = sp.cafe === "all";
  const cafeteriaId = !isTodos && cafeterias.some((c) => c.id === sp.cafe) ? sp.cafe! : cafeterias[0].id;
  const selectedTab = isTodos ? "all" : cafeteriaId;
  const cafeteria = cafeterias.find((c) => c.id === cafeteriaId)!;
  const { year, month } = parseMonth(sp.mes);
  const mesValue = `${year}-${String(month).padStart(2, "0")}`;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl">Pedidos — Comisariato</h1>
          <p className="text-sm text-muted-foreground">
            Pedidos diarios de los cafés-cliente, para calcular la facturación mensual.
          </p>
        </div>
        <Link
          href="/pedidos/productos"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
        >
          <Settings className="h-4 w-4" />
          Productos y precios
        </Link>
      </header>

      <form method="get" className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {cafeterias.map((c) => (
            <Link
              key={c.id}
              href={`/pedidos?cafe=${c.id}&mes=${mesValue}`}
              className={
                c.id === selectedTab
                  ? "rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white"
                  : "rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
              }
            >
              {c.name}
            </Link>
          ))}
          <Link
            href={`/pedidos?cafe=all&mes=${mesValue}`}
            className={
              selectedTab === "all"
                ? "rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white"
                : "rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
            }
          >
            Todos
          </Link>
        </div>
        <input type="hidden" name="cafe" value={selectedTab} />
        <MonthPicker name="mes" defaultValue={mesValue} />
        <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted">
          Ver
        </button>
      </form>

      {isTodos ? (
        <TodosView venueId={selected.id} year={year} month={month} daysInMonth={daysInMonth} />
      ) : (
        <CafeView cafeteriaId={cafeteriaId} cafeteriaName={cafeteria.name} year={year} month={month} daysInMonth={daysInMonth} />
      )}
    </div>
  );
}

async function CafeView({
  cafeteriaId,
  cafeteriaName,
  year,
  month,
  daysInMonth,
}: {
  cafeteriaId: string;
  cafeteriaName: string;
  year: number;
  month: number;
  daysInMonth: number;
}) {
  const [productos, pedidos, factura] = await Promise.all([
    getProductosCafeteria(cafeteriaId),
    getPedidosMes(cafeteriaId, year, month),
    getFacturaMes(cafeteriaId, year, month),
  ]);

  const initialQuantities: Record<string, number> = {};
  for (const p of pedidos) initialQuantities[`${p.productoId}_${p.day}`] = p.quantity;

  return (
    <PedidosGrid
      cafeteriaId={cafeteriaId}
      cafeteriaName={cafeteriaName}
      year={year}
      month={month}
      daysInMonth={daysInMonth}
      productos={productos.map((p) => ({ id: p.id, name: p.name, price: Number(p.price.toString()) }))}
      initialQuantities={initialQuantities}
      ivaRate={IVA_RATE}
      facturado={factura ? { amount: Number(factura.amount.toString()), createdAt: factura.createdAt.toISOString() } : null}
    />
  );
}

async function TodosView({
  venueId,
  year,
  month,
  daysInMonth,
}: {
  venueId: string;
  year: number;
  month: number;
  daysInMonth: number;
}) {
  const resumen = await getPedidosMesTodos(venueId, year, month);
  return (
    <PedidosResumen
      daysInMonth={daysInMonth}
      productos={resumen.productos}
      quantities={resumen.quantities}
      dailyTotals={resumen.dailyTotals}
      subtotal={resumen.subtotal}
      totalConIva={resumen.totalConIva}
      ivaRate={IVA_RATE}
    />
  );
}
