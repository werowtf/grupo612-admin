import Link from "next/link";
import { Plus, X } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { getVenueDocuments, type DocumentFilters } from "@/lib/documents/queries";
import { DocumentsList } from "@/components/documents-list";
import { DOCUMENT_CATEGORIES, documentCategoryLabels } from "@/lib/labels";
import { VenueTag } from "@/components/venue-tag";
import type { DocumentCategory } from "@/generated/prisma/enums";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
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

  const filters: DocumentFilters = {
    category: DOCUMENT_CATEGORIES.includes(sp.category as DocumentCategory)
      ? (sp.category as DocumentCategory)
      : undefined,
    search: sp.search?.trim() || undefined,
    take: 300,
  };
  const hasFilters = Boolean(filters.category || filters.search);

  const { rows, total } = await getVenueDocuments(selected.id, filters);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl">Documentos</h1>
          <p className="text-sm text-muted-foreground"><VenueTag name={selected.name} /></p>
        </div>
        <Link href="/documentos/nuevo" className={buttonVariants()}>
          <Plus className="h-4 w-4" />
          Subir documento
        </Link>
      </header>

      <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[180px] flex-1">
          <label className="label" htmlFor="search">Buscar</label>
          <Input id="search" name="search" defaultValue={filters.search ?? ""} placeholder="Título, etiqueta, archivo…" />
        </div>
        <div>
          <label className="label" htmlFor="category">Categoría</label>
          <select id="category" name="category" defaultValue={filters.category ?? ""} className="input">
            <option value="">Todas</option>
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{documentCategoryLabels[c]}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Button type="submit">Filtrar</Button>
          {hasFilters && (
            <Link href="/documentos" className={buttonVariants({ variant: "outline" })}>
              <X className="h-4 w-4" /> Limpiar
            </Link>
          )}
        </div>
      </form>

      <div className="text-sm text-muted-foreground">
        {total} documento{total === 1 ? "" : "s"}{hasFilters ? " (filtrados)" : ""}
      </div>
      <DocumentsList rows={rows} emptyText="No hay documentos que coincidan." />
    </div>
  );
}
