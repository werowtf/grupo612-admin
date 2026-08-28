"use client";

import { Plus } from "lucide-react";
import { useDailySaleDialog } from "@/components/daily-sales-context";
import { Button } from "@/components/ui/button";

export function RegistrarVentaButton() {
  const { openNew } = useDailySaleDialog();
  return (
    <Button type="button" variant="outline" onClick={openNew}>
      <Plus className="h-4 w-4" />
      Registrar venta
    </Button>
  );
}
