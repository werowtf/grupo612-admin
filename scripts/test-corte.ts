import { readFileSync } from "node:fs";
import { extractCorteFromLines } from "@/lib/cortes/extract";
import { parseCorteImage } from "@/lib/cortes/ocr";

const SYNTHETIC = `
BIZNAGA BAJA BISTRO
CORTE Z
DEL 27/07/2026
FOLIO CORTE Z: 1120
CAJA
+EFECTIVO INIC $5,000.00
+EFECTIVO: $3,337.50
+TARJETA: $23,995.90
-RETIROS EFECT $0.00
-PROPINAS PAGA $1,874.90
EFECTIVO FINA $6,462.60
FORMA DE PAGO VENTAS
EFECTIVO: $3,337.50
VISA: $16,035.00
MASTERCARD: $4,730.00
AMERICAN EXPRESS: $1,356.00
TOTAL FORMAS $25,458.50
FORMA DE PAGO PROPINA
VISA: $1,380.50
MASTERCARD: $337.00
AMERICAN EXPRESS: $157.40
TOTAL FORMAS PAGO $1,874.90
VENTA POR TIPO DE PRODUCTO
ALIMENTOS: $16,711.21 (76%) 79.50
BEBIDAS: $5,387.93 (24%) 61
SUBTOTAL : $22,099.14
DESCUENTOS : $152.16
VENTA NETA $21,946.98
IMPUESTO 16%: $3,511.52
VENTAS CON IMP.: $25,458.50
CUENTAS NORMALES : 19
CUENTAS CANCELADAS : 0
COMENSALES : 46
CUENTA PROMEDIO : $1,155.10
FOLIO INICIAL :20645
FOLIO FINAL :20663
SOBRANTE(+) O FALTANTE(-): $-5,000.00
`;

async function main() {
  console.log("===== EXTRACTOR (texto sintético Corte Z) =====");
  const { draft, detected } = extractCorteFromLines(SYNTHETIC.split("\n"));
  console.log("Detectados:", detected.length, "campos");
  console.table(draft);

  if (process.argv.includes("--ocr")) {
    console.log("\n===== OCR (corte biznaga.jpeg) =====");
    const img = readFileSync(
      "C:/Users/geagu/OneDrive/Documentos/WERO/Clientes/G612 ADMIN/corte biznaga.jpeg",
    );
    const res = await parseCorteImage(Buffer.from(img));
    console.log("Texto OCR (primeras 900):\n", (res.rawText ?? "").slice(0, 900));
    console.log("\nBorrador OCR:");
    console.table(res.draft);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
