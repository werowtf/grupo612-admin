import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { getCafeterias, getProductosCafeteria } from "@/lib/pedidos/queries";
import { ProductosCafeteriaManager } from "@/components/productos-cafeteria-manager";
import type { UserRole } from "@/generated/prisma/enums";

const PUEDEN_EDITAR: UserRole[] = ["ADMIN", "GERENTE", "CONTADOR"];

export default async function ProductosCafeteriaPage() {
  const { user, selected } = await getAppContext();
  if (!PUEDEN_EDITAR.includes(user.role)) notFound();

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
        Los productos de cafetería son exclusivos de Comisariato. Cambia de negocio en el menú de arriba.
      </div>
    );
  }

  const cafeterias = await getCafeterias(selected.id);
  const productosPorCafe = await Promise.all(
    cafeterias.map(async (c) => ({
      cafeteria: c,
      productos: await getProductosCafeteria(c.id, { includeInactive: true }),
    })),
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/pedidos"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Pedidos
        </Link>
        <h1 className="mt-1 text-xl">Productos y precios</h1>
        <p className="text-sm text-muted-foreground">
          Cada café puede tener su propio precio por producto. Los cambios no afectan pedidos ya
          capturados: el precio queda congelado en el pedido del día en que se guardó.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {productosPorCafe.map(({ cafeteria, productos }) => (
          <ProductosCafeteriaManager
            key={cafeteria.id}
            cafeteriaId={cafeteria.id}
            title={cafeteria.name}
            rows={productos.map((p) => ({
              id: p.id,
              name: p.name,
              price: Number(p.price.toString()),
              active: p.active,
            }))}
          />
        ))}
      </div>
    </div>
  );
}
