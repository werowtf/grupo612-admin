"use client";

import { useRef, useState, useTransition, useActionState } from "react";
import { UploadCloud, FileSpreadsheet, FileText, Camera, PencilLine, CheckCircle2, AlertCircle, Save, Plus, Trash2 } from "lucide-react";
import { processCorteFileAction, saveCorteAction } from "@/app/(app)/cortes/actions";
import { CORTE_SECTIONS } from "@/lib/cortes/fields";
import type { CorteDraft } from "@/lib/cortes/types";
import type { CorteSource } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Values = Record<string, string>;
// "PDF" y "FOTO" son solo de la interfaz: ambos se guardan con origen OCR,
// porque el enum CorteSource de la base no distingue entre los dos.
type Method = "MANUAL" | "EXCEL" | "PDF" | "FOTO";

interface EgresoDia {
  category: string;
  description: string;
  amount: string;
}

interface Props {
  venueId: string;
  venueName: string;
  corteId?: string;
  initialValues?: Values;
  initialSource?: CorteSource;
  /** Conceptos de egreso del negocio; sólo se usan al capturar un corte nuevo. */
  egresoCategories?: string[];
}

function draftToValues(draft: CorteDraft): Values {
  const v: Values = {};
  for (const [k, val] of Object.entries(draft)) {
    if (val !== undefined && val !== null) v[k] = String(val);
  }
  return v;
}

// Debe quedar por debajo del maxDuration del endpoint (60s) para que el
// cliente nunca espere más que el propio servidor.
const OCR_TIMEOUT_MS = 55_000;

export function CorteEditor({ venueId, venueName, corteId, initialValues, initialSource, egresoCategories }: Props) {
  // Al capturar un corte nuevo se arranca en foto/PDF, que es el flujo diario;
  // al editar uno existente se respeta cómo se capturó.
  const [method, setMethod] = useState<Method>(
    initialSource === "EXCEL" ? "EXCEL" : initialSource === "MANUAL" ? "MANUAL" : "PDF",
  );
  const [values, setValues] = useState<Values>(initialValues ?? {});
  const [detected, setDetected] = useState<Set<string>>(new Set());
  const [source, setSource] = useState<CorteSource>(initialSource ?? "MANUAL");
  const [fileName, setFileName] = useState<string>(initialValues?.fileName ?? "");
  const [processing, startProcessing] = useTransition();
  const [ocrPending, setOcrPending] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [procMsg, setProcMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Gastos en efectivo del mismo día del corte (propinas, una pipa de agua,
  // etc.): sólo aplica al capturar un corte nuevo, para no duplicarlos si se
  // vuelve a editar el mismo corte más tarde.
  const [egresosDia, setEgresosDia] = useState<EgresoDia[]>([]);

  const [saveState, saveAction, saving] = useActionState(saveCorteAction, {});

  function setField(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function addEgresoDia() {
    setEgresosDia((rows) => [...rows, { category: egresoCategories?.[0] ?? "", description: "", amount: "" }]);
  }
  function updateEgresoDia(i: number, patch: Partial<EgresoDia>) {
    setEgresosDia((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function removeEgresoDia(i: number) {
    setEgresosDia((rows) => rows.filter((_, idx) => idx !== i));
  }

  function applyExtraction(
    draft: CorteDraft,
    detectedKeys: string[],
    extractionSource: CorteSource,
    name: string,
    detectedVenueName?: string,
    extractionWarnings?: string[],
  ) {
    setValues((v) => ({ ...v, ...draftToValues(draft) }));
    setDetected(new Set(detectedKeys));
    setSource(extractionSource);
    setFileName(name);
    setWarnings(extractionWarnings ?? []);
    const n = detectedKeys.length;

    if (detectedVenueName && detectedVenueName !== venueName) {
      setProcMsg({
        ok: false,
        text: `El ticket parece ser de ${detectedVenueName}, pero estás capturando en ${venueName}. Cambia de negocio (arriba) antes de guardar, o verifica la foto.`,
      });
      return;
    }

    setProcMsg({
      ok: true,
      text: `Se detectaron ${n} campo${n === 1 ? "" : "s"}. Revísalos y corrige lo necesario antes de guardar.`,
    });
  }

  function onProcess() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setProcMsg({ ok: false, text: "Selecciona un archivo primero." });
      return;
    }

    if (method === "PDF" || method === "FOTO") {
      void onProcessOcr(file);
      return;
    }

    // Excel: parseo local rápido, sigue usando la Server Action.
    const fd = new FormData();
    fd.set("file", file);
    setProcMsg(null);
    startProcessing(async () => {
      try {
        const res = await processCorteFileAction(fd);
        if (!res.ok) {
          setProcMsg({ ok: false, text: res.error });
          return;
        }
        applyExtraction(
          res.extraction.draft,
          res.extraction.detected as string[],
          res.extraction.source,
          file.name,
          undefined,
          res.extraction.warnings,
        );
      } catch (err) {
        console.error("Error al procesar archivo:", err);
        setProcMsg({
          ok: false,
          text: "No se pudo procesar el archivo. Intenta de nuevo o captura los datos manualmente.",
        });
      }
    });
  }

  /**
   * OCR de la foto vía endpoint con streaming: reporta progreso real y nunca
   * se queda "colgado" (timeout propio + manejo de error en cada rama).
   */
  async function onProcessOcr(file: File) {
    setOcrPending(true);
    setOcrProgress(0);
    setProcMsg(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);

    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/cortes/ocr", {
        method: "POST",
        body: fd,
        signal: controller.signal,
      });
      if (!res.body) throw new Error("Sin respuesta del servidor.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) >= 0) {
          const raw = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (!raw.trim()) continue;
          const evt = JSON.parse(raw) as
            | { type: "progress"; progress: number }
            | {
                type: "done";
                ok: true;
                result: {
                  draft: CorteDraft;
                  detected: string[];
                  source: CorteSource;
                  detectedVenueName?: string;
                  warnings?: string[];
                };
              }
            | { type: "done"; ok: false; error: string };

          if (evt.type === "progress") {
            setOcrProgress(Math.max(0, Math.min(100, Math.round(evt.progress * 100))));
          } else if (evt.ok) {
            applyExtraction(
              evt.result.draft,
              evt.result.detected,
              evt.result.source,
              file.name,
              evt.result.detectedVenueName,
              evt.result.warnings,
            );
          } else {
            setProcMsg({ ok: false, text: evt.error });
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setProcMsg({
          ok: false,
          text: "El procesamiento tardó demasiado. Intenta con una foto más ligera/nítida o captura los datos manualmente.",
        });
      } else {
        console.error("Error OCR:", err);
        setProcMsg({
          ok: false,
          text: "No se pudo leer el ticket. Intenta de nuevo o captura los datos manualmente.",
        });
      }
    } finally {
      clearTimeout(timeoutId);
      setOcrPending(false);
      setOcrProgress(null);
    }
  }

  const methods: { id: Method; label: string; icon: React.ComponentType<{ className?: string }>; hint: string }[] = [
    { id: "PDF", label: "Subir PDF", icon: FileText, hint: "PDF del corte de Soft Restaurant." },
    { id: "FOTO", label: "Subir foto", icon: Camera, hint: "Foto del ticket impreso." },
    { id: "EXCEL", label: "Subir Excel", icon: FileSpreadsheet, hint: "Export de Soft Restaurant (.xlsx)." },
    { id: "MANUAL", label: "Captura manual", icon: PencilLine, hint: "Escribe los datos del corte." },
  ];

  return (
    <div className="space-y-6">
      {/* Selector de método */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                active ? "ring-2 ring-brand-600" : "hover:bg-muted/50",
              )}
            >
              <Icon className={cn("mt-0.5 h-5 w-5", active ? "text-brand-600" : "text-muted-foreground")} />
              <span>
                <span className="block text-sm font-medium">{m.label}</span>
                <span className="block text-xs text-muted-foreground">{m.hint}</span>
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
                {method === "EXCEL"
                  ? "Archivo Excel (.xlsx)"
                  : method === "PDF"
                    ? "PDF del corte (.pdf)"
                    : "Foto del ticket (.jpg / .png)"}
              </label>
              <Input
                ref={fileRef}
                id="corte-file"
                type="file"
                accept={
                  method === "EXCEL"
                    ? ".xlsx,.xls"
                    : method === "PDF"
                      ? "application/pdf,.pdf"
                      : "image/*"
                }
                className="file:mr-2 file:h-6 file:rounded file:border-0 file:bg-brand-50 file:px-2.5 file:py-0 file:text-xs file:text-brand-600"
              />
            </div>
            <Button type="button" onClick={onProcess} disabled={processing || ocrPending}>
              <UploadCloud className="h-4 w-4" />
              {ocrPending
                ? `Procesando… ${ocrProgress ?? 0}%`
                : processing
                  ? "Procesando…"
                  : "Procesar archivo"}
            </Button>
          </div>
          {(method === "PDF" || method === "FOTO") && (
            <p className="text-xs text-muted-foreground">
              La lectura automática es un apoyo: revisa siempre los campos antes de guardar. El PDF
              del sistema se lee mejor que una foto; los campos que no se puedan leer con certeza se
              dejan vacíos para que los captures.
            </p>
          )}
          {procMsg && (
            <p
              className={cn(
                "flex items-start gap-2 rounded-lg px-3 py-2 text-sm",
                procMsg.ok
                  ? "bg-brand-50 text-brand-600"
                  : "bg-danger-bg text-danger",
              )}
            >
              {procMsg.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
              {procMsg.text}
            </p>
          )}

          {warnings.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-pending-bg px-3 py-2 text-sm text-pending">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <p className="font-medium">
                  {warnings.length === 1
                    ? "Un total del ticket no cuadra:"
                    : `${warnings.length} totales del ticket no cuadran:`}
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
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
                        <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-600">
                          detectado
                        </span>
                      )}
                    </label>
                    <Input
                      id={f.key}
                      name={f.key}
                      type={f.type === "date" ? "date" : f.type === "text" ? "text" : "number"}
                      step={f.type === "money" ? "0.01" : f.type === "int" ? "1" : undefined}
                      value={values[f.key] ?? ""}
                      onChange={(e) => setField(f.key, e.target.value)}
                      className={cn(wasDetected && "border-brand-600")}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {!corteId && egresoCategories && egresoCategories.length > 0 && (
          <div className="card space-y-3 p-5">
            <input type="hidden" name="egresosDia" value={JSON.stringify(egresosDia)} />
            <div>
              <h2 className="text-base font-semibold">Gastos en efectivo de hoy</h2>
              <p className="text-sm text-muted-foreground">
                Opcional: propinas pagadas, una pipa de agua, o cualquier otro gasto en efectivo del
                mismo día. Se registran junto con el corte, en Egresos.
              </p>
            </div>

            {egresosDia.map((row, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-3">
                <div className="min-w-[160px] flex-1">
                  <label className="label" htmlFor={`egreso-cat-${i}`}>Concepto</label>
                  <Select value={row.category} onValueChange={(v) => updateEgresoDia(i, { category: v })}>
                    <SelectTrigger id={`egreso-cat-${i}`} className="h-8 w-full border-transparent bg-field-bg font-normal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {egresoCategories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[160px] flex-1">
                  <label className="label" htmlFor={`egreso-desc-${i}`}>Descripción (opcional)</label>
                  <Input
                    id={`egreso-desc-${i}`}
                    value={row.description}
                    onChange={(e) => updateEgresoDia(i, { description: e.target.value })}
                    placeholder="Ej. Pipa de agua"
                  />
                </div>
                <div className="w-32">
                  <label className="label" htmlFor={`egreso-amt-${i}`}>Monto</label>
                  <Input
                    id={`egreso-amt-${i}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.amount}
                    onChange={(e) => updateEgresoDia(i, { amount: e.target.value })}
                  />
                </div>
                <Button type="button" variant="ghost" size="icon-sm" title="Quitar" onClick={() => removeEgresoDia(i)}>
                  <Trash2 className="h-3.5 w-3.5 text-danger" />
                </Button>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={addEgresoDia}>
              <Plus className="h-4 w-4" />
              Agregar gasto
            </Button>
          </div>
        )}

        <div className="card p-5">
          <label className="label" htmlFor="notes">
            Notas
          </label>
          <Textarea
            id="notes"
            name="notes"
            rows={2}
            value={values.notes ?? ""}
            onChange={(e) => setField("notes", e.target.value)}
            placeholder="Observaciones del corte…"
          />
        </div>

        {saveState.error && (
          <p className="flex items-center gap-2 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
            <AlertCircle className="h-4 w-4" />
            {saveState.error}
          </p>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Negocio: {venueName}</p>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Guardando…" : "Guardar corte"}
          </Button>
        </div>
      </form>
    </div>
  );
}
