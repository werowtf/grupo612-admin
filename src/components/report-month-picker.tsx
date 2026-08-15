"use client";

import { useRouter } from "next/navigation";
import { MonthPicker } from "@/components/month-picker";

export function ReportMonthPicker({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();

  return (
    <MonthPicker
      name="mes"
      defaultValue={defaultValue}
      onChange={(value) => router.push(`/reportes?mes=${value}`)}
    />
  );
}
