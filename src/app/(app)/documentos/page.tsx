import { redirect } from "next/navigation";

/** La sección Documentos se quitó del menú; los adjuntos se ven desde el corte o movimiento. */
export default function DocumentosPage() {
  redirect("/dashboard");
}
