"use client";

import { Printer, Download } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export function ReportActions({ exportHref }: { exportHref: string }) {
  return (
    <div className="flex gap-2 print:hidden">
      <a href={exportHref} className={buttonVariants({ variant: "outline" })}>
        <Download className="h-4 w-4" />
        Exportar CSV
      </a>
      <Button type="button" variant="outline" onClick={() => window.print()}>
        <Printer className="h-4 w-4" />
        Imprimir
      </Button>
    </div>
  );
}
