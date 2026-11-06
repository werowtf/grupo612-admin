"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Loader2, Undo2 } from "lucide-react";
import { prestarAction, reembolsarAction } from "@/app/(app)/oficina/prestamos/actions";
import { PAYMENT_METHODS, paymentLabels } from "@/lib/entries/config";
import { formatMXN } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import type { PaymentMethod } from "@/generated/prisma/enums";

export interface PrestamoRow {
  id: string;
  date: string; // yyyy-mm-dd
  lender: string;
  borrower: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: "VIGENTE" | "REEMBOLSADO";
  reimbursedAt: string | null; // yyyy-mm-dd
}

const TRIGGER = "h-9 w-full border-transparent bg-field-bg font-normal text-foreground hover:bg-muted/50";

function fmtDate(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export function PrestamosManager({
  venues,
  rows,
}: {
  venues: { id: string; name: string }[];
  rows: PrestamoRow[];
}) {
  const router = useRouter();
  const [lender, setLender] = useState("");
  const [borrower, setBorrower] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("EFECTIVO");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sending = useRef(false);

  const [target, setTarget] = useState<PrestamoRow | null>(null);
  const [repayMethod, setRepayMethod] = useState<PaymentMethod>("EFECTIVO");
  const [repaying, setRepaying] = useState(false);
  const [repayError, setRepayError] = useState<string | null>(null);
  const repayRef = useRef(false);

  const pendiente = rows.filter((r) => r.status === "VIGENTE").reduce((s, r) => s + r.amount, 0);

  async function onPrestar(e: React.FormEvent) {
    e.preventDefault();
    if (sending.current) return;
    setError(null);
    const value = Number(amount);
    if (!lender) return setError("Elige el negocio que presta.");
    if (!borrower) return setError("Elige el negocio que recibe.");
    if (lender === borrower) return setError("El negocio que presta y el que recibe deben ser distintos.");
    if (!Number.isFinite(value) || value <= 0) return setError("Escribe un monto mayor a cero.");

    sending.current = true;
    setSaving(true);
    const res = await prestarAction({ lenderVenueId: lender, borrowerVenueId: borrower, amount: value, paymentMethod: method });
    sending.current = false;
    setSaving(false);
    if (res.error) return setError(res.error);
    setAmount("");
    router.refresh();
  }

  function openRepay(r: PrestamoRow) {
    setRepayMethod(r.paymentMethod);
    setRepayError(null);
    setTarget(r);
  }

  async function onReembolsar() {
    if (!target || repayRef.current) return;
    repayRef.current = true;
    setRepaying(true);
    setRepayError(null);
    const res = await reembolsarAction({ id: target.id, paymentMethod: repayMethod });
    repayRef.current = false;
    setRepaying(false);
    if (res.error) {
      setRepayError(res.error);
      router.refresh();
      return;
    }
    setTarget(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onPrestar} className="card space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end">
          <div>
            <label className="label" htmlFor="lender">Negocio que presta</label>
            <Select value={lender} onValueChange={setLender}>
              <SelectTrigger id="lender" className={TRIGGER}>
                <SelectValue placeholder="Selecciona…" />
              </SelectTrigger>
              <SelectContent>
                {venues.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="label" htmlFor="borrower">Negocio que recibe</label>
            <Select value={borrower} onValueChange={setBorrower}>
              <SelectTrigger id="borrower" className={TRIGGER}>
                <SelectValue placeholder="Selecciona…" />
              </SelectTrigger>
              <SelectContent>
                {venues.filter((v) => v.id !== lender).map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="label" htmlFor="method">Forma de pago</label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger id="method" className={TRIGGER}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>{paymentLabels[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="label" htmlFor="amount">Monto</label>
            <Input id="amount" type="number" step="0.01" min="0" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {saving ? "Prestando…" : "Prestar"}
          </Button>
        </div>
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Al prestar se registra un egreso en el negocio que presta y un ingreso en el que recibe.
        </p>
      </form>

      <section className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">Historial de préstamos</h2>
          <span className="text-sm text-muted-foreground">
            Pendiente por reembolsar: <span className="font-semibold text-foreground tabular-nums">{formatMXN(pendiente)}</span>
          </span>
        </div>
        {rows.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted-foreground">Aún no hay préstamos entre negocios.</div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-table-header text-left text-[10px] uppercase tracking-wide text-brand-600">
                    <th className="px-3 py-2 font-semibold">Fecha</th>
                    <th className="px-3 py-2 font-semibold">Presta</th>
                    <th className="px-3 py-2 font-semibold">Recibe</th>
                    <th className="px-3 py-2 font-semibold">Forma de pago</th>
                    <th className="px-3 py-2 text-right font-semibold">Monto</th>
                    <th className="px-3 py-2 font-semibold">Estado</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/60">
                      <td className="whitespace-nowrap px-3 py-2 font-semibold text-muted-foreground">{fmtDate(r.date)}</td>
                      <td className="px-3 py-2">{r.lender}</td>
                      <td className="px-3 py-2">{r.borrower}</td>
                      <td className="px-3 py-2 text-muted-foreground">{paymentLabels[r.paymentMethod]}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatMXN(r.amount)}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {r.status === "REEMBOLSADO" ? (
                          <span className="text-muted-foreground">
                            Reembolsado{r.reimbursedAt ? ` · ${fmtDate(r.reimbursedAt)}` : ""}
                          </span>
                        ) : (
                          <span className="font-medium text-pending">Vigente</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {r.status === "VIGENTE" && (
                          <Button type="button" variant="outline" size="sm" onClick={() => openRepay(r)}>
                            <Undo2 className="h-3.5 w-3.5" />
                            Reembolsar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <Dialog open={!!target} onOpenChange={(o) => !o && !repaying && setTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reembolsar préstamo</DialogTitle>
          </DialogHeader>
          {target && (
            <div className="space-y-3 text-sm">
              <p>
                <span className="font-semibold">{target.borrower}</span> le regresa{" "}
                <span className="font-semibold tabular-nums">{formatMXN(target.amount)}</span> a{" "}
                <span className="font-semibold">{target.lender}</span>.
              </p>
              <div>
                <label className="label" htmlFor="repay-method">Forma de pago</label>
                <Select value={repayMethod} onValueChange={(v) => setRepayMethod(v as PaymentMethod)}>
                  <SelectTrigger id="repay-method" className={TRIGGER}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>{paymentLabels[m]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Se registra un egreso en {target.borrower} y un ingreso en {target.lender}.
              </p>
              {repayError && (
                <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2 text-danger">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {repayError}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={repaying} />}>Cancelar</DialogClose>
            <Button type="button" onClick={onReembolsar} disabled={repaying}>
              {repaying && <Loader2 className="h-4 w-4 animate-spin" />}
              {repaying ? "Reembolsando…" : "Reembolsar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
