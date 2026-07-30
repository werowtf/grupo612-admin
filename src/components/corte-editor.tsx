"use client";

import { useRef, useState, useTransition, useActionState } from "react";
import { UploadCloud, FileSpreadsheet, Camera, PencilLine, CheckCircle2, AlertCircle, Save } from "lucide-react";
import { processCorteFileAction, saveCorteAction } from "@/app/(app)/cortes/actions";
import { CORTE_SECTIONS } from "@/lib/cortes/fields";
import type { CorteDraft } from "@/lib/cortes/types";
import type { CorteSource } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

type Values = Record<string, string>;
type Method = "MANUAL" | "EXCEL" | "OCR";

interface Props {
  venueId: string;
  venueName: string;
  corteId?: string;
  initialValues?: Values;
  initialSource?: CorteSource;
}

function draftToValues(draft: CorteDraft): Values {
  const v: Values = {};
  for (const [k, val] of Object.entries(draft)) {
    if (val !== undefined && val !== null) v[k] = String(val);
  }
  return v;
}

export function CorteEditor({ venueId, venueName, corteId, initialValues, initialSource }: Props) {
  const [method, setMethod] = useState<Method>(
    initialSource && initialSource !== "MANUAL" ? initialSource : "MANUAL",
  );
  const [values, setValues] = useState<Values>(initialValues ?? {});
  const [detected, setDetected] = useState<Set<string>>(new Set());
  const [source, setSource] = useState<CorteSource>(initialSource ?? "MANUAL");
  const [fileName, setFileName] = useState<string>(initialValues?.fileName ?? "");
  const [processing, startProcessing] = useTransition();
  const [procMsg, setProcMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [saveState, saveAction, saving] = useActionState(saveCorteAction, {});

  function setField(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function onProcess() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setProcMsg({ ok: false, text: "Selecciona un archivo primero." });
      return;
    }
    const fd = new FormData();
    fd.set("file", file);
    startProcessing(async () => {
      const res = await processCorteFileAction(fd);
      if (!res.ok) {
        setProcMsg({ ok: false, text: res.error });
        return;
      }
      const draft = res.extraction.draft;
      setValues((v) => ({ ...v, ...draftToValues(draft) }));
      setDetected(new Set(res.extraction.detected as string[]));
      setSource(res.extraction.source);
      setFileName(file.name);
      const n = res.extraction.detected.length;
      setProcMsg({
        ok: true,
        text: `Se detectaron ${n} campo${n === 1 ? "" : "s"}. Revísalos y corrige lo necesario antes de guardar.`,
      });
    });
  }

  const methods: { id: Method; label: string; icon: React.ComponentType<{ className?: string }>; hint: string }[] = [
    { id: "MANUAL", label: "Captura manual", icon: PencilLine, hint: "Escribe los datos del corte." },
    { id: "EXCEL", label: "Subir Excel", icon: FileSpreadsheet, hint: "Export de Soft Restaurant (.xlsx)." },
    { id: "OCR", label: "Subir foto", icon: Camera, hint: "Foto del ticket Corte Z (OCR)." },
  ];

  return (
    <div className="space-y-6">
      {/* Selector de método */}
      <div className="grid gap-3 sm:grid-cols-3">
        {methods.map((m) => {
          const Icon = m.icon;
          const active = method === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className={cn(
                "card flex items-start gap-3 p-4 text-left transition-colors",
                active ? "ring-2 ring-brand-500" : "hover:bg-gray-50",
              )}
            >
              <Icon className={cn("mt-0.5 h-5 w-5", active ? "text-brand-600" : "text-[var(--color-muted)]")} />
              <span>
                <span className="block text-sm font-medium">{m.label}</span>
                <span className="block text-xs text-[var(--color-muted)]">{m.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Subida de archivo */}
      {method !== "MANUAL" && (
        <div className="card space-y-3 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <label className="label" htmlFor="corte-file">
                {method === "EXCEL" ? "Archivo Excel (.xlsx)" : "Foto del ticket (.jpg / .png)"}
              </label>
              <input
                ref={fileRef}
                id="corte-file"
                type="file"
                accept={method === "EXCEL" ? ".xlsx,.xls" : "image/*"}
                className="input file:mr-3 file:rounded file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:text-brand-700"
              />
            </div>
            <button type="button" onClick={onProcess} disabled={processing} className="btn-primary">
              <UploadCloud className="h-4 w-4" />
              {processing ? "Procesando…" : "Procesar archivo"}
            </button>
          </div>
          {method === "OCR" && (
            <p className="text-xs text-[var(--color-muted)]">
              El OCR es un apoyo: en fotos de baja calidad algunos campos pueden salir mal. Revísalos siempre.
            </p>
          )}
          {procMsg && (
            <p
              className={cn(
                "flex items-start gap-2 rounded-lg px-3 py-2 text-sm",
                procMsg.ok
                  ? "bg-brand-50 text-brand-700"
                  : "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
              )}
            >
              {procMsg.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
              {procMsg.text}
            </p>
          )}
        </div>
      )}

      {/* Formulario editable */}
      <form action={saveAction} className="space-y-6">
        <input type="hidden" name="venueId" value={venueId} />
        <input type="hidden" name="source" value={source} />
        <input type="hidden" name="fileName" value={fileName} />
        {corteId && <input type="hidden" name="corteId" value={corteId} />}

        {CORTE_SECTIONS.map((section) => (
          <div key={section.title} className="card p-5">
            <h2 className="mb-4 text-base font-semibold">{section.title}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.fields.map((f) => {
                const wasDetected = detected.has(f.key);
                return (
                  <div key={f.key}>
                    <label className="label flex items-center gap-2" htmlFor={f.key}>
                      {f.label}
                      {wasDetected && (
                        <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">
                          detectado
                        </span>
                      )}
                    </label>
                    <input
                      id={f.key}
                      name={f.key}
                      type={f.type === "date" ? "date" : f.type === "text" ? "text" : "number"}
                      step={f.type === "money" ? "0.01" : f.type === "int" ? "1" : undefined}
                      value={values[f.key] ?? ""}
                      onChange={(e) => setField(f.key, e.target.value)}
                      className={cn("input", wasDetected && "border-brand-500")}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="card p-5">
          <label className="label" htmlFor="notes">
            Notas
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            value={values.notes ?? ""}
            onChange={(e) => setField("notes", e.target.value)}
            className="input"
            placeholder="Observaciones del corte…"
          />
        </div>

        {saveState.error && (
          <p className="flex items-center gap-2 rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
            <AlertCircle className="h-4 w-4" />
            {saveState.error}
          </p>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--color-muted)]">Sucursal: {venueName}</p>
          <button type="submit" disabled={saving} className="btn-primary">
            <Save className="h-4 w-4" />
            {saving ? "Guardando…" : "Guardar corte"}
          </button>
        </div>
      </form>
    </div>
  );
}
