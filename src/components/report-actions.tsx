"use client";

import { Printer, Download } from "lucide-react";

export function ReportActions({ exportHref }: { exportHref: string }) {
  return (
    <div className="flex gap-2 print:hidden">
      <a href={exportHref} className="btn-ghost">
        <Download className="h-4 w-4" />
        Exportar CSV
      </a>
      <button type="button" onClick={() => window.print()} className="btn-ghost">
        <Printer className="h-4 w-4" />
        Imprimir
      </button>
    </div>
  );
}
