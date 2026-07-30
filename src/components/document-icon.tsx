import { FileText, FileImage, FileSpreadsheet, File } from "lucide-react";
import { cn } from "@/lib/utils";

export function DocumentIcon({ mime, className }: { mime: string; className?: string }) {
  const cls = cn("h-5 w-5", className);
  if (mime.startsWith("image/")) return <FileImage className={cn(cls, "text-purple-500")} />;
  if (mime === "application/pdf") return <FileText className={cn(cls, "text-rose-500")} />;
  if (mime.includes("sheet") || mime.includes("excel") || mime === "text/csv") {
    return <FileSpreadsheet className={cn(cls, "text-brand-600")} />;
  }
  return <File className={cn(cls, "text-[var(--color-muted)]")} />;
}
