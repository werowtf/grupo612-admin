"use client";

import { useRef, useState, useTransition, useActionState } from "react";
import { UploadCloud, FileSpreadsheet, Camera, PencilLine, CheckCircle2, AlertCircle, Save } from "lucide-react";
import { processCorteFileAction, saveCorteAction } from "@/app/(app)/cortes/actions";
import { CORTE_SECTIONS } from "@/lib/cortes/fields";
import type { CorteDraft } from "@/lib/cortes/types";
import type { CorteSource } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

// Debe quedar por debajo del maxDuration del endpoint (60s) para que el
// cliente nunca espere más que el propio servidor.
const OCR_TIMEOUT_MS = 55_000;

export function CorteEditor({ venueId, venueName, corteId, initialValues, initialSource }: Props) {
  const [method, setMethod] = useState<Method>(
    initialSource && initialSource !== "MANUAL" ? initialSource : "MANUAL",
  );
  const [values, setValues] = useState<Values>(initialValues ?? {});
  const [detected, setDetected] = useState<Set<string>>(new Set());
  const [source, setSource] = useState<CorteSource>(initialSource ?? "MANUAL");
  const [fileName, setFileName] = useState<string>(initialValues?.fileName ?? "");
  const [processing, startProcessing] = useTransition();
  const [ocrPending, setOcrPending] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [procMsg, setProcMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [saveState, saveAction, saving] = useActionState(saveCorteAction, {});

  function setField(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function applyExtraction(
    draft: CorteDraft,
    detectedKeys: string[],
    extractionSource: CorteSource,
    name: string,
    detectedVenueName?: string,
  ) {
    setValues((v) => ({ ...v, ...draftToValues(draft) }));
    setDetected(new Set(detectedKeys));
    setSource(extractionSource);
    setFileName(name);
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

    if (method === "OCR") {
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
        applyExtraction(res.extraction.draft, res.extraction.detected as string[], res.extraction.source, file.name);
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
                result: { draft: CorteDraft; detected: string[]; source: CorteSource; detectedVenueName?: string };
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
                active ? "ring-2 ring-brand-500" : "hover:bg-muted/50",
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
              <Input
                ref={fileRef}
                id="corte-file"
                type="file"
                accept={method === "EXCEL" ? ".xlsx,.xls" : "image/*"}
                className="file:mr-3 file:rounded file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:text-brand-700"
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
                    <Input
                      id={f.key}
                      name={f.key}
                      type={f.type === "date" ? "date" : f.type === "text" ? "text" : "number"}
                      step={f.type === "money" ? "0.01" : f.type === "int" ? "1" : undefined}
                      value={values[f.key] ?? ""}
                      onChange={(e) => setField(f.key, e.target.value)}
                      className={cn(wasDetected && "border-brand-500")}
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
          <p className="flex items-center gap-2 rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
            <AlertCircle className="h-4 w-4" />
            {saveState.error}
          </p>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--color-muted)]">Negocio: {venueName}</p>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Guardando…" : "Guardar corte"}
          </Button>
        </div>
      </form>
    </div>
  );
}
