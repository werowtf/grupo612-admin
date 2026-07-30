"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, Unlink, Sparkles, ArrowRight } from "lucide-react";
import {
  linkDepositAction,
  unlinkDepositAction,
  autoMatchCorteAction,
} from "@/app/(app)/cortes/actions";
import type { DepositRow } from "@/lib/cortes/matching";
import { formatMXN, formatDate, cn } from "@/lib/utils";

interface Props {
  corteId: string;
  cardTotal: number;
  linked: DepositRow[];
  linkedTotal: number;
  suggestions: DepositRow[];
}

export function CorteMatching({ corteId, cardTotal, linked, linkedTotal, suggestions }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const diff = Math.round((cardTotal - linkedTotal) * 100) / 100;
  const conciliado = cardTotal > 0 && Math.abs(diff) < 0.5;

  function run(fn: () => Promise<unknown>) {
    start(async () => {
      await fn();
      router.refresh();
    });
  }

  if (cardTotal <= 0) {
    return (
      <div className="card p-5">
        <h2 className="text-base font-semibold">Conciliación con banco</h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Este corte no registra ventas con tarjeta (Visa/Mastercard/Amex), por lo que
          no hay depósitos que conciliar.
        </p>
      </div>
    );
  }

  return (
    <div className="card space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Conciliación con banco</h2>
          <p className="text-sm text-[var(--color-muted)]">
            Ventas con tarjeta del corte vs. depósitos recibidos en el banco.
          </p>
        </div>
        <button
          type="button"
          onClick={() => run(() => autoMatchCorteAction(corteId))}
          disabled={pending}
          className="btn-ghost"
        >
          <Sparkles className="h-4 w-4" />
          Auto-conciliar
        </button>
      </div>

      {/* Resumen */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Summary label="Tarjeta (corte)" value={formatMXN(cardTotal)} />
        <Summary label="Depósitos vinculados" value={formatMXN(linkedTotal)} />
        <Summary
          label="Diferencia"
          value={formatMXN(diff)}
          tone={conciliado ? "ok" : diff > 0 ? "pending" : "warn"}
          hint={
            conciliado
              ? "Conciliado"
              : diff > 0
                ? "Falta vincular / comisión"
                : "Depósitos exceden la venta"
          }
        />
      </div>

      {/* Vinculados */}
      {linked.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium">Depósitos vinculados</h3>
          <ul className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)]">
            {linked.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate">{d.description}</div>
                  <div className="text-xs text-[var(--color-muted)]">
                    {formatDate(d.date)} · {d.accountAlias}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums font-medium text-brand-600">
                    {formatMXN(d.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => run(() => unlinkDepositAction(d.id))}
                    disabled={pending}
                    className="text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                    title="Desvincular"
                  >
                    <Unlink className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sugerencias */}
      <div>
        <h3 className="mb-2 text-sm font-medium">
          Depósitos sugeridos{" "}
          <span className="font-normal text-[var(--color-muted)]">
            (mismo periodo, sin conciliar)
          </span>
        </h3>
        {suggestions.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            No hay depósitos sin conciliar en el rango de fechas del corte.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)]">
            {suggestions.slice(0, 8).map((d) => {
              const close = Math.abs(d.amount - (cardTotal - linkedTotal)) < Math.max(cardTotal * 0.03, 50);
              return (
                <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate">{d.description}</div>
                    <div className="text-xs text-[var(--color-muted)]">
                      {formatDate(d.date)} · {d.accountAlias}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn("tabular-nums", close && "font-semibold text-brand-600")}>
                      {formatMXN(d.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => run(() => linkDepositAction(corteId, d.id))}
                      disabled={pending}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-xs font-medium hover:bg-brand-50 hover:text-brand-700"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Vincular
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
        <ArrowRight className="h-3 w-3" />
        La diferencia suele corresponder a la comisión del banco (tasa de descuento + IVA).
      </p>
    </div>
  );
}

function Summary({
  label,
  value,
  tone = "default",
  hint,
}: {
  label: string;
  value: string;
  tone?: "default" | "ok" | "pending" | "warn";
  hint?: string;
}) {
  const toneClass = {
    default: "text-[var(--color-fg)]",
    ok: "text-brand-600",
    pending: "text-[var(--color-warning)]",
    warn: "text-[var(--color-danger)]",
  }[tone];
  return (
    <div className="rounded-lg border border-[var(--color-border)] p-3">
      <div className="text-xs text-[var(--color-muted)]">{label}</div>
      <div className={cn("mt-0.5 text-lg font-semibold tabular-nums", toneClass)}>{value}</div>
      {hint && <div className="text-[11px] text-[var(--color-muted)]">{hint}</div>}
    </div>
  );
}
