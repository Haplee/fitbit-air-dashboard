# Fitbit Air Dashboard — patch de Neon a Supabase

Este parche cambia el driver Neon por `postgres` + Drizzle y mueve las tablas a un esquema privado `fitbit` de PostgreSQL.

## Proyecto Supabase detectado

- Proyecto: `fitbit-air-dashboard`
- Project ref: `aevxswjuedgoapdhdunx`
- Región: `eu-central-1` (Frankfurt)
- URL del proyecto: `https://aevxswjuedgoapdhdunx.supabase.co`

## Aplicar el parche en tu repositorio local

1. Descomprime el ZIP en una carpeta temporal.
2. Copia el contenido manteniendo las rutas y sobrescribe los archivos equivalentes de tu proyecto:
   - `src/lib/db/index.ts`
   - `src/lib/db/schema.ts`
   - `scripts/migrate.ts`
   - `drizzle/0000_initial.sql`
   - `.env.example`
3. En PowerShell, desde la raíz del proyecto:

   ```powershell
   npm uninstall @neondatabase/serverless
   npm install postgres
   ```

4. Abre Supabase Dashboard > proyecto `fitbit-air-dashboard` > **Connect** > **Transaction pooler**. Copia la URI y sustituye el marcador de contraseña por la contraseña real de la base de datos. Usa la URI del pooler de transacciones (normalmente puerto 6543), no la URL `https://...supabase.co` ni una API key.
5. Coloca la URI en `.env.local`:

   ```env
   DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?..."
   ```

6. Ejecuta el esquema:

   ```powershell
   npm run db:migrate
   ```

7. Comprueba que se han creado las tablas en el esquema `fitbit` desde Supabase > SQL Editor:

   ```sql
   select table_schema, table_name
   from information_schema.tables
   where table_schema = 'fitbit'
   order by table_name;
   ```

8. Arranca y comprueba:

   ```powershell
   npm run dev
   npm run build
   ```

## Notas de seguridad

- El esquema `fitbit` es privado y no debe añadirse a los esquemas expuestos por Supabase Data API.
- Las tablas tienen RLS activado y no reciben políticas públicas. La aplicación accede mediante la conexión PostgreSQL server-side.
- `DATABASE_URL` es un secreto. Nunca uses `NEXT_PUBLIC_DATABASE_URL`, no lo subas a GitHub ni lo pegues en chats.
- Para Vercel, añade la misma `DATABASE_URL` como variable cifrada en Production, Preview y Development.
- Este parche presupone una base de datos nueva sin tablas antiguas que deban conservarse. Si ya ejecutaste el SQL anterior de Neon en Supabase y creó tablas en `public`, no las borres: ejecuta primero la inspección y planifica una migración de datos antes de cambiar el esquema.

## Limitación del alcance

Este parche adapta la conexión y las tablas para Supabase PostgreSQL. No configura por sí mismo Google OAuth, Google Health API ni las variables de Vercel.
