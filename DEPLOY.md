# Despliegue a producción — Vercel + Supabase

Guía paso a paso para publicar la plataforma. Sigue el orden: primero Supabase
(la base de datos), luego Vercel (la app).

## 1. Crear el proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com) → **New project**.
2. Elige una contraseña de base de datos fuerte y guárdala (la necesitarás para
   las cadenas de conexión). Región recomendada: la más cercana a los usuarios
   (p. ej. `us-west-1` para México).
3. Espera a que el proyecto termine de aprovisionarse (~2 minutos).
4. Ve a **Project Settings → Database → Connection string**:
   - Copia la de **"Transaction pooler"** (puerto **6543**) → esta es tu
     `DATABASE_URL`. Agrega `?pgbouncer=true` al final si no lo trae.
   - Copia la de **"Direct connection"** (puerto **5432**) → esta es tu
     `DIRECT_URL`.

   `DATABASE_URL` la usa la app en cada request (por eso necesita el pooler:
   Vercel ejecuta muchas funciones serverless en paralelo). `DIRECT_URL` la usa
   sólo el CLI de Prisma para migraciones, que necesitan una conexión de sesión
   directa (el pooler en modo transacción no la soporta).

## 2. Aplicar el esquema a Supabase

Desde tu máquina, con las variables de Supabase apuntando temporalmente en `.env`:

```bash
# En plataforma/.env, reemplaza DATABASE_URL y DIRECT_URL por las de Supabase
npx prisma migrate deploy
```

Esto crea todas las tablas usando el historial de migraciones versionado en
`prisma/migrations/`. Después, siembra los datos base (sucursales, usuarios):

```bash
npm run seed
```

> Cambia las contraseñas del seed (`Grupo612.2026`) antes de dar acceso real,
> desde `/usuarios` una vez que la app esté arriba.

## 3. Crear el proyecto en Vercel

1. Sube este repo a GitHub (o usa `vercel` CLI para desplegar sin Git).
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repo.
3. **Root Directory**: déjalo en `/` (la raíz) — el repo se inicializó dentro de
   `plataforma/`, así que el proyecto Next.js ya está en la raíz del repo.
4. Framework Preset: Next.js (se detecta automático).

## 4. Variables de entorno en Vercel

En **Project Settings → Environment Variables**, agrega (Production y Preview):

| Variable | Valor |
|---|---|
| `DATABASE_URL` | Connection string **pooled** de Supabase (puerto 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Connection string **directa** de Supabase (puerto 5432) |
| `AUTH_SECRET` | Genera uno nuevo — **no reuses el de desarrollo**: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `NODE_ENV` | `production` (Vercel la define sola; no es necesario agregarla) |

## 5. Deploy

Con las variables configuradas, haz clic en **Deploy**. El build corre:

```
prisma generate && next build
```

(el `postinstall` también corre `prisma generate` por si acaso). Las
migraciones **no** corren automáticamente en cada build — eso es intencional,
para no arriesgar la base de datos en despliegues concurrentes. Aplica
migraciones nuevas manualmente cuando cambie el esquema:

```bash
npx prisma migrate deploy   # con DIRECT_URL de producción en tu entorno
```

## 6. Después del primer deploy

- Entra con el usuario admin del seed y **cambia su contraseña** desde `/usuarios`.
- Verifica que las 4 sucursales y las cuentas bancarias sean correctas.
- Prueba subir un estado de cuenta real desde `/conciliacion` o el portal de
  contabilidad externa (`/portal`).

## Limitación conocida: archivos en la base de datos

Las fotos de tickets (cortes de caja, ingresos/egresos) y los documentos del
repositorio se guardan como bytes **dentro de Postgres** (columnas `Bytes`),
no en un servicio de almacenamiento de archivos. Esto funciona bien para
empezar, pero:

- Infla el tamaño de la base de datos (Supabase free tier: 500 MB).
- Hace las copias de seguridad más pesadas.

**Antes de que el volumen de fotos/documentos crezca**, conviene migrar ese
almacenamiento a **Supabase Storage** o **Cloudflare R2** (guardar sólo la URL
en la base de datos). No es necesario para el primer despliegue, pero es la
siguiente mejora de infraestructura recomendada.

## Variables de entorno — referencia rápida

Ver [`.env.example`](.env.example) para el detalle de cada variable y su formato.
