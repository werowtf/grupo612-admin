import { redirect } from "next/navigation";

/** La sección se separó en /ingresos y /egresos; esta ruta queda por los enlaces viejos. */
export default async function IngresosEgresosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? `?mes=${sp.mes}` : "";
  redirect(`/ingresos${mes}`);
}
