import { LoginForm } from "./login-form";
import { Logo } from "@/components/logo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Logo className="mx-auto mb-3 h-16 w-auto" />
          <h1 className="text-xl">Plataforma Administrativa</h1>
        </div>

        <div className="card p-6">
          <LoginForm next={next ?? "/dashboard"} />
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Acceso restringido al personal autorizado.
        </p>
      </div>
    </main>
  );
}
