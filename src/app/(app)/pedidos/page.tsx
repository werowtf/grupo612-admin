import Link from "next/link";
import { Settings } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { getCafeterias, getProductosCafeteria, getPedidosMes, getFacturaMes, IVA_RATE } from "@/lib/pedidos/queries";
import { PedidosGrid } from "@/components/pedidos-grid";
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

  const cafeteriaId = cafeterias.some((c) => c.id === sp.cafe) ? sp.cafe! : cafeterias[0].id;
  const cafeteria = cafeterias.find((c) => c.id === cafeteriaId)!;
  const { year, month } = parseMonth(sp.mes);
  const mesValue = `${year}-${String(month).padStart(2, "0")}`;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const [productos, pedidos, factura] = await Promise.all([
    getProductosCafeteria(cafeteriaId),
    getPedidosMes(cafeteriaId, year, month),
    getFacturaMes(cafeteriaId, year, month),
  ]);

  const initialQuantities: Record<string, number> = {};
  for (const p of pedidos) initialQuantities[`${p.productoId}_${p.day}`] = p.quantity;

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
                c.id === cafeteriaId
                  ? "rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white"
                  : "rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
              }
            >
              {c.name}
            </Link>
          ))}
        </div>
        <input type="hidden" name="cafe" value={cafeteriaId} />
        <MonthPicker name="mes" defaultValue={mesValue} />
        <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted">
          Ver
        </button>
      </form>

      <PedidosGrid
        cafeteriaId={cafeteriaId}
        cafeteriaName={cafeteria.name}
        year={year}
        month={month}
        daysInMonth={daysInMonth}
        productos={productos.map((p) => ({ id: p.id, name: p.name, price: Number(p.price.toString()) }))}
        initialQuantities={initialQuantities}
        ivaRate={IVA_RATE}
        facturado={factura ? { amount: Number(factura.amount.toString()), createdAt: factura.createdAt.toISOString() } : null}
      />
    </div>
  );
}
