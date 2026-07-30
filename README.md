# Plataforma Administrativa y Financiera — Grupo 612

Plataforma web para centralizar la administración financiera de Grupo 612
(Biznaga, Uno/Unobar, Trooftop). Este primer entregable cubre la **fundación**
(usuarios, roles, multi-sucursal, auditoría) y la **conciliación bancaria**
(importación de estados de cuenta, clasificación automática y edición).

## Stack

- **Next.js 16** (App Router, Server Actions) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Prisma 7** + **PostgreSQL**
- Auth propia con **JWT (jose)** + **bcrypt**, protección de rutas vía `proxy.ts`
- Parsers de estados de cuenta: **Santander** (CSV) y **BanBajío** (XLSX, `exceljs`)

## Requisitos

- Node.js 20.9+ (probado con Node 24)
- No requiere Docker: la base de datos local usa **PostgreSQL embebido**.

## Puesta en marcha (desarrollo)

```bash
npm install
```

1. **Base de datos local** (deja este proceso corriendo en una terminal):

   ```bash
   npm run db:server
   ```

   Levanta PostgreSQL en `localhost:54329`, con datos persistentes en `./.pgdata`.

2. **Aplica el esquema y siembra datos** (en otra terminal):

   ```bash
   npm run db:push
   npm run seed
   ```

3. **Arranca la app**:

   ```bash
   npm run dev
   ```

   Abre http://localhost:3000

### Usuarios de prueba (seed)

| Correo                      | Rol           | Contraseña      |
| --------------------------- | ------------- | --------------- |
| `admin@grupo612.mx`             | Administrador       | `Grupo612.2026` |
| `contabilidad@grupo612.mx`      | Contabilidad        | `Grupo612.2026` |
| `contadora.externa@grupo612.mx` | Contabilidad externa| `Grupo612.2026` |
| `compras@grupo612.mx`           | Compras             | `Grupo612.2026` |

> Cambia estas contraseñas antes de cualquier uso real.

## Roles y áreas restringidas

- **Administrador / Contabilidad / Gerente / Cajero** usan el panel completo.
- **Contabilidad externa** (`CONTADOR_EXTERNO`) entra a un **portal restringido**
  (`/portal`) cuya única función es **subir estados de cuenta**, con historial como
  comprobante — reemplaza el envío por WhatsApp.
- **Compras** (`COMPRAS`) entra a un área restringida (`/compras`) para **registrar
  las compras diarias** (egresos), manualmente o **tomando una foto del ticket**
  (OCR), con su historial de compras.

El bloqueo por rol se aplica en `src/proxy.ts`.

## Ingresos y egresos

Módulo (`/ingresos-egresos`) para registrar ingresos y egresos con categorías,
proveedor, forma de pago y **foto del ticket** (OCR opcional). Resumen de
ingresos/egresos/neto, filtros y detalle con la imagen del ticket.

## Usuarios

Gestión completa de usuarios (`/usuarios`, sólo Administrador): crear, editar rol y
sucursales asignadas, activar/desactivar, y restablecer contraseña. El sistema
impide que el administrador se quite a sí mismo el rol o se desactive si es el
único administrador activo.

## Documentos

Repositorio centralizado (`/documentos`) para facturas, contratos, comprobantes,
identificaciones, permisos, etc. Filtros por categoría y búsqueda, vista previa
de imágenes/PDF, y descarga. Los documentos se pueden **vincular** a un corte de
caja o a un movimiento de ingresos/egresos (sección "Documentos" en su detalle),
para que la evidencia quede junto al registro correspondiente.

## Reportes

Reporte mensual (`/reportes`) que sintetiza las tres fuentes: **ventas** (cortes),
**banco** (comisiones y flujo por categoría) e **ingresos/egresos**. Incluye
indicadores, gráficas (formas de pago, producto, categorías), conciliación de
tarjeta vs depositado, selector de mes y sucursal (o **consolidado**), y
**exportación a CSV** e impresión.

## Sucursales y bancos

- **Biznaga** → BanBajío
- **UNO Bar**, **612 Rooftop**, **Comisariato** → Santander

## Conciliación bancaria

En **Conciliación bancaria** (o en el portal de contabilidad externa) se sube el
archivo del banco:

- **Santander**: archivo `.csv` (export de movimientos).
- **BanBajío**: archivo `.xlsx` ("ConsultaMovimientos").

Los movimientos se clasifican en **Transferencia · Cheque · Depósito · Comisión ·
Gasto tarjeta** (+ Otro). En el detalle de cada **corte de caja** se pueden vincular
los **depósitos bancarios** de ventas con tarjeta (conciliación corte ↔ banco).

El sistema detecta el banco, normaliza los movimientos, los **clasifica
automáticamente** (Depósito, Transferencia, Cheque, Comisión, Compra, Otro) y
**omite duplicados** si el archivo se vuelve a subir. La categoría y el estatus
(pendiente / conciliado / ignorado) de cada movimiento son editables.

## Cortes de caja

En **Cortes de caja** se registra el cierre de caja (Corte Z) por tres vías, todas
con una **pantalla de revisión editable** antes de guardar:

- **Captura manual**.
- **Subir Excel** — export de **Soft Restaurant**. El parser escanea etiquetas
  conocidas (efectivo, Visa, Mastercard, Amex, alimentos, bebidas, IVA, propinas,
  folios…) y es flexible ante el layout; se afinará con un export real de SR.
- **Subir foto** — OCR del ticket con Tesseract (español). Es un apoyo: en fotos
  de baja calidad conviene revisar los campos.

## Scripts útiles

| Script               | Descripción                                        |
| -------------------- | -------------------------------------------------- |
| `npm run dev`        | App en modo desarrollo                             |
| `npm run db:server`  | PostgreSQL local embebido (puerto 54329)           |
| `npm run db:push`    | Aplica el esquema Prisma a la base                 |
| `npm run seed`       | Crea sucursales, cuentas y usuarios de prueba      |
| `npm run db:studio`  | Prisma Studio (explorador de datos)                |
| `npx tsx scripts/test-parsers.ts` | Valida los parsers contra archivos de muestra |

## Producción

Guía completa de despliegue (Vercel + Supabase) en [`DEPLOY.md`](DEPLOY.md).

Resumen: `DATABASE_URL` (conexión pooled) la usa la app vía el driver adapter
`pg`; `DIRECT_URL` (conexión directa) la usa el CLI de Prisma para migraciones.
Existe un historial de migraciones versionado en `prisma/migrations/` —
aplícalo con `npx prisma migrate deploy`.

## Estructura

```
src/
  app/
    login/            · pantalla de acceso
    (app)/            · panel autenticado (layout con sidebar + sucursal)
      dashboard/      · resumen financiero
      conciliacion/   · importación + estados de cuenta
      movimientos/    · listado con filtros y edición
      bitacora/       · auditoría (admin)
      usuarios/       · usuarios (admin)
  components/         · UI (sidebar, topbar, tablas, badges, formularios)
  lib/
    import/           · parsers Santander/BanBajío + clasificador + dedupe
    auth.ts, session.ts, prisma.ts, queries.ts, ...
prisma/schema.prisma  · modelo de datos
scripts/              · servidor de BD, seed, pruebas
```
