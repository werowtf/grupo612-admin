"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TRIGGER_CLASS = "h-8 w-full border-transparent bg-field-bg font-normal text-foreground hover:bg-muted/50";

type Props = {
  /** Prefijo de los parámetros de URL: "ing" → ing_search / ing_category. */
  prefix: "ing" | "egr";
  categories: string[];
  searchPlaceholder: string;
  defaultSearch: string;
  defaultCategory: string;
};

/** Filtros propios de una tabla (buscar + categoría); se aplican al instante. */
function EntryTypeFilters({ prefix, categories, searchPlaceholder, defaultSearch, defaultCategory }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(defaultSearch);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kSearch = `${prefix}_search`;
  const kCategory = `${prefix}_category`;

  function push(patch: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v && v !== "todas") params.set(k, v);
      else params.delete(k);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const active = Boolean(defaultSearch || defaultCategory !== "todas");

  return (
    <div className="card flex flex-wrap items-end gap-3 p-3">
      <div className="min-w-[180px] flex-1">
        <label className="label" htmlFor={kSearch}>Buscar</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id={kSearch}
            value={search}
            placeholder={searchPlaceholder}
            className="pl-8"
            onChange={(e) => {
              const v = e.target.value;
              setSearch(v);
              if (timer.current) clearTimeout(timer.current);
              timer.current = setTimeout(() => push({ [kSearch]: v.trim() }), 400);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (timer.current) clearTimeout(timer.current);
                push({ [kSearch]: search.trim() });
              }
            }}
          />
        </div>
      </div>
      <div className="min-w-[160px]">
        <label className="label" htmlFor={kCategory}>Categoría</label>
        <Select value={defaultCategory} onValueChange={(v) => push({ [kCategory]: v })}>
          <SelectTrigger id={kCategory} className={TRIGGER_CLASS}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {active && (
        <button
          type="button"
          className="flex h-8 cursor-pointer items-center gap-1 rounded-lg px-2 text-sm text-muted-foreground hover:bg-muted"
          onClick={() => {
            setSearch("");
            push({ [kSearch]: "", [kCategory]: "" });
          }}
        >
          <X className="h-4 w-4" /> Limpiar
        </button>
      )}
    </div>
  );
}

/** Filtros de la tabla "Otros ingresos". */
export function IngresosFilters(props: Omit<Props, "prefix" | "searchPlaceholder">) {
  return <EntryTypeFilters {...props} prefix="ing" searchPlaceholder="Concepto, folio…" />;
}

/** Filtros de la tabla "Egresos". */
export function EgresosFilters(props: Omit<Props, "prefix" | "searchPlaceholder">) {
  return <EntryTypeFilters {...props} prefix="egr" searchPlaceholder="Proveedor, concepto, folio…" />;
}
