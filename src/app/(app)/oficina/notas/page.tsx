import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOficinaNotas } from "@/lib/oficina/queries";
import { OficinaNotasManager, type NotaRow } from "@/components/oficina-notas-manager";

export default async function OficinaNotasPage() {
  const user = await getCurrentUser();
  if (!user?.canAccessOficina) notFound();

  const notas = await getOficinaNotas();
  const rows: NotaRow[] = notas.map((n) => ({
    id: n.id,
    content: n.content,
    authorName: n.createdBy?.name ?? null,
    updatedAt: n.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl">Notas</h1>
        <p className="text-sm text-muted-foreground">Bloc de notas compartido de Oficina.</p>
      </header>

      <OficinaNotasManager notas={rows} />
    </div>
  );
}
