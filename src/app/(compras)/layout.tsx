import { redirect } from "next/navigation";
import { LogOut, ShoppingCart } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/(app)/actions";
import { Logo } from "@/components/logo";

export default async function ComprasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "COMPRAS") redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Logo className="h-8 w-auto" />
            <div className="flex items-center gap-1 text-[11px] text-[var(--color-muted)]">
              <ShoppingCart className="h-3.5 w-3.5" />
              Registro de compras
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[var(--color-muted)] sm:block">{user.name}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-[var(--color-muted)] hover:bg-muted/50 hover:text-[var(--color-fg)]"
              >
                <LogOut className="h-4 w-4" />
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
