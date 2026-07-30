"use client";

import { useRef, useState, useTransition, useActionState } from "react";
import { ScanLine, Save, AlertCircle, CheckCircle2, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { saveEntryAction, processTicketAction, type EntryFormState } from "@/app/(app)/ingresos-egresos/actions";
import { categoriesFor, PAYMENT_METHODS, paymentLabels } from "@/lib/entries/config";
import type { EntryType } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

type Values = Record<string, string>;

interface Props {
  venues: { id: string; name: string }[];
  defaultVenueId: string;
  mode?: "full" | "compra"; // compra = sólo egreso, foto destacada
  redirectTo: string;
  entryId?: string;
  initialValues?: Values;
  initialType?: EntryType;
}

const init: EntryFormState = {};

export function EntryForm({
  venues,
  defaultVenueId,
  mode = "full",
  redirectTo,
  entryId,
  initialValues,
  initialType,
}: Props) {
  const compra = mode === "compra";
  const [type, setType] = useState<EntryType>(compra ? "EGRESO" : initialType ?? "EGRESO");
  const [values, setValues] = useState<Values>(initialValues ?? {});
  const [source, setSource] = useState<"MANUAL" | "OCR">(
    (initialValues?.source as "MANUAL" | "OCR") ?? "MANUAL",
  );
  const [detected, setDetected] = useState<Set<string>>(new Set());
  const [ocrMsg, setOcrMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [processing, startProcessing] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, action, saving] = useActionState(saveEntryAction, init);

  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));
  const categories = categoriesFor(type);
  const showPhoto = type === "EGRESO" || compra;

  function onReadTicket() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setOcrMsg({ ok: false, text: "Selecciona una foto del ticket primero." });
      return;
    }
    const fd = new FormData();
    fd.set("photo", file);
    startProcessing(async () => {
      const res = await processTicketAction(fd);
      if (!res.ok) {
        setOcrMsg({ ok: false, text: res.error });
        return;
      }
      const d = res.draft;
      setValues((p) => ({
        ...p,
        ...(d.amount != null ? { amount: String(d.amount) } : {}),
        ...(d.date ? { date: d.date } : {}),
        ...(d.folio ? { folio: d.folio } : {}),
        ...(d.rfc ? { rfc: d.rfc } : {}),
        ...(d.supplier ? { supplier: d.supplier } : {}),
        rawText: res.rawText,
      }));
      setDetected(new Set(res.detected));
      setSource("OCR");
      const n = res.detected.length;
      setOcrMsg({
        ok: true,
        text: `Se leyeron ${n} dato${n === 1 ? "" : "s"} del ticket. Revísalos y completa lo que falte.`,
      });
    });
  }

  const field = (
    key: string,
    label: string,
    type: "text" | "number" | "date" = "text",
    opts?: { step?: string; placeholder?: string },
  ) => {
    const was = detected.has(key);
    return (
      <div>
        <label className="label flex items-center gap-2" htmlFor={key}>
          {label}
          {was && (
            <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">
              del ticket
            </span>
          )}
        </label>
        <input
          id={key}
          name={key}
          type={type}
          step={opts?.step}
          placeholder={opts?.placeholder}
          value={values[key] ?? ""}
          onChange={(e) => set(key, e.target.value)}
          className={cn("input", was && "border-brand-500")}
        />
      </div>
    );
  };

  return (
    <form action={action} className="space-y-5" encType="multipart/form-data">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="rawText" value={values.rawText ?? ""} />
      {entryId && <input type="hidden" name="entryId" value={entryId} />}

      {/* Tipo (sólo módulo completo) */}
      {!compra && (
        <div className="flex gap-2">
          {(["EGRESO", "INGRESO"] as EntryType[]).map((t) => {
            const active = type === t;
            const Icon = t === "EGRESO" ? ArrowUpRight : ArrowDownLeft;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "btn flex-1 border",
                  active
                    ? t === "EGRESO"
                      ? "border-rose-300 bg-rose-50 text-rose-700"
                      : "border-brand-300 bg-brand-50 text-brand-700"
                    : "border-[var(--color-border)] bg-white text-[var(--color-muted)]",
                )}
              >
                <Icon className="h-4 w-4" />
                {t === "EGRESO" ? "Egreso / Gasto" : "Ingreso"}
              </button>
            );
          })}
        </div>
      )}
      <input type="hidden" name="type" value={type} />

      {/* Foto del ticket (egresos) */}
      {showPhoto && (
        <div className="card space-y-3 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <label className="label" htmlFor="photo">
                Foto del ticket (opcional)
              </label>
              <input
                ref={fileRef}
                id="photo"
                name="photo"
                type="file"
                accept="image/*"
                capture="environment"
                className="input file:mr-3 file:rounded file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:text-brand-700"
              />
            </div>
            <button type="button" onClick={onReadTicket} disabled={processing} className="btn-ghost">
              <ScanLine className="h-4 w-4" />
              {processing ? "Leyendo…" : "Leer ticket"}
            </button>
          </div>
          {ocrMsg && (
            <p
              className={cn(
                "flex items-start gap-2 rounded-lg px-3 py-2 text-sm",
                ocrMsg.ok ? "bg-brand-50 text-brand-700" : "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
              )}
            >
              {ocrMsg.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
              {ocrMsg.text}
            </p>
          )}
        </div>
      )}

      <div className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
        {venues.length > 1 ? (
          <div>
            <label className="label" htmlFor="venueId">
              Sucursal
            </label>
            <select
              id="venueId"
              name="venueId"
              defaultValue={initialValues?.venueId ?? defaultVenueId}
              className="input"
            >
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="venueId" value={defaultVenueId} />
        )}

        {field("date", "Fecha", "date")}
        {field("amount", "Monto", "number", { step: "0.01", placeholder: "0.00" })}

        <div>
          <label className="label" htmlFor="category">
            Categoría
          </label>
          <select
            id="category"
            name="category"
            value={values.category ?? ""}
            onChange={(e) => set("category", e.target.value)}
            className="input"
          >
            <option value="">Selecciona…</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="paymentMethod">
            Forma de pago
          </label>
          <select
            id="paymentMethod"
            name="paymentMethod"
            value={values.paymentMethod ?? "EFECTIVO"}
            onChange={(e) => set("paymentMethod", e.target.value)}
            className="input"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {paymentLabels[m]}
              </option>
            ))}
          </select>
        </div>

        {field("supplier", type === "INGRESO" ? "Origen / cliente" : "Proveedor")}
        {field("folio", "Folio del ticket")}
        {field("rfc", "RFC (opcional)")}
        {field("reference", "Referencia (opcional)")}
        <div className="sm:col-span-2 lg:col-span-3">
          {field("description", "Descripción")}
        </div>
      </div>

      <div className="card p-5">
        <label className="label" htmlFor="notes">
          Notas
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          value={values.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
          className="input"
        />
      </div>

      {state.error && (
        <p className="flex items-center gap-2 rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
          <AlertCircle className="h-4 w-4" />
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="btn-primary">
          <Save className="h-4 w-4" />
          {saving ? "Guardando…" : compra ? "Registrar compra" : "Guardar movimiento"}
        </button>
      </div>
    </form>
  );
}
