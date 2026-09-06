import Link from "next/link";
import { Settings } from "lucide-react";
import { getAppContext } from "@/lib/context";
import {
  getCafeterias,
  getProductosCafeteria,
  getPedidosMes,
  getFacturaMes,
  getPedidosMesTodos,
  getFoliosMes,
  IVA_RATE,
} from "@/lib/pedidos/queries";
import { PedidosGrid } from "@/components/pedidos-grid";
import { PedidosResumen } from "@/components/pedidos-resumen";
import { MonthPicker } from "@/components/month-picker";
import { PedidosSaveProvider } from "@/components/pedidos-save-context";
import { PedidosTabs } from "@/components/pedidos-tabs";

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
  // No se hacen pedidos los domingos: esos días no se muestran en la rejilla.
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1).filter(
    (d) => new Date(Date.UTC(year, month - 1, d)).getUTCDay() !== 0,
  );

  const tabs = [
    ...cafeterias.map((c) => ({
      id: c.id,
      label: c.name,
      href: `/pedidos?cafe=${c.id}&mes=${mesValue}`,
      active: c.id === selectedTab,
    })),
    { id: "all", label: "Todos", href: `/pedidos?cafe=all&mes=${mesValue}`, active: selectedTab === "all" },
  ];

  return (
    <PedidosSaveProvider>
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl">Pedidos</h1>
            <p className="text-sm text-muted-foreground">
              Pedidos diarios de los cafés-cliente, para calcular la facturación mensual.
            </p>
          </div>
          <Link
            href="/pedidos/productos"
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-600 px-3 py-1.5 text-sm text-brand-600 hover:bg-brand-50"
          >
            <Settings className="h-4 w-4" />
            Productos y precios
          </Link>
        </header>

        <form method="get" className="flex flex-wrap items-center gap-3">
          <PedidosTabs tabs={tabs} />
          <input type="hidden" name="cafe" value={selectedTab} />
          <MonthPicker name="mes" defaultValue={mesValue} />
          <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted">
            Ver
          </button>
        </form>

        {isTodos ? (
          <TodosView venueId={selected.id} year={year} month={month} days={days} />
        ) : (
          <CafeView cafeteriaId={cafeteriaId} cafeteriaName={cafeteria.name} year={year} month={month} days={days} />
        )}
      </div>
    </PedidosSaveProvider>
  );
}

async function CafeView({
  cafeteriaId,
  cafeteriaName,
  year,
  month,
  days,
}: {
  cafeteriaId: string;
  cafeteriaName: string;
  year: number;
  month: number;
  days: number[];
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
      days={days}
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
  days,
}: {
  venueId: string;
  year: number;
  month: number;
  days: number[];
}) {
  const [resumen, folios] = await Promise.all([
    getPedidosMesTodos(venueId, year, month),
    getFoliosMes(venueId, year, month),
  ]);
  return (
    <PedidosResumen
      venueId={venueId}
      year={year}
      month={month}
      days={days}
      productos={resumen.productos}
      quantities={resumen.quantities}
      dailyTotals={resumen.dailyTotals}
      subtotal={resumen.subtotal}
      totalConIva={resumen.totalConIva}
      ivaRate={IVA_RATE}
      initialFolios={folios}
    />
  );
}
