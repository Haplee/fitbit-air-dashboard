# Fitbit Air Dashboard

Dashboard privado para consultar métricas de Fitbit Air y Google Health, importar históricos de Google Takeout y visualizar actividad, frecuencia cardíaca y sueño. Está preparado para desplegarse en Vercel.

> **Estado del proyecto:** MVP funcional de importación y visualización. La conexión OAuth y la consulta de Google Health están implementadas como conector configurable; deben probarse con un proyecto Google Cloud real, scopes habilitados y una cuenta de prueba. El endpoint de webhook está deliberadamente desactivado hasta configurar y verificar un subscriber de Google Health.

## Arquitectura

- **Next.js App Router + React 19 + TypeScript + Tailwind CSS v4**: frontend y API.
- **Neon PostgreSQL + Drizzle ORM**: almacenamiento persistente; Vercel no ofrece almacenamiento SQLite persistente en el filesystem de sus funciones.
- **Google Takeout**: el ZIP se abre en el navegador con zip.js; solo se envían lotes pequeños de métricas normalizadas al backend.
- **Google Health API v4**: OAuth 2.0, refresh tokens cifrados con AES-256-GCM y consulta de tipos de datos.
- **Acceso privado**: contraseña única con bcrypt y cookie JWT HttpOnly.
- **Informe histórico**: filtros por periodo, evolución diaria y tabla de muestras.
- **Vercel Cron**: sincronización diaria de recuperación. En Vercel Hobby la programación es como máximo diaria; para mayor frecuencia se necesita un plan que lo permita o un proveedor de colas/cron externo.
- **Región**: funciones en Frankfurt (`fra1`) y base Neon recomendada en Frankfurt para reducir latencia entre aplicación y datos.

## Requisitos

- Node.js 22 (mínimo 20.9)
- npm 10+ (también compatible con pnpm 9+)
- Proyecto Neon PostgreSQL
- Cuenta Vercel
- (Opcional) Proyecto Google Cloud con Google Health API activada y credenciales OAuth 2.0

## Desarrollo local

```bash
npm install
Copy-Item .env.example .env.local
npm run auth:hash
```

Copia la salida `APP_PASSWORD_HASH` a `.env.local`. Genera secretos:

En PowerShell (Windows), genera secretos seguros:

```powershell
$authBytes = New-Object byte[] 48
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($authBytes)
[Convert]::ToBase64String($authBytes) # AUTH_SECRET
$googleBytes = New-Object byte[] 32
$rng.GetBytes($googleBytes)
[Convert]::ToBase64String($googleBytes) # GOOGLE_TOKEN_ENCRYPTION_KEY
$cronBytes = New-Object byte[] 32
$rng.GetBytes($cronBytes)
[Convert]::ToHexString($cronBytes).ToLower() # CRON_SECRET
```

Configura `DATABASE_URL` con la cadena de Neon y aplica el esquema:

```bash
npm run db:migrate
npm run dev
```

Abre `http://localhost:3000`.

## Despliegue en Vercel

1. Sube el repositorio a GitHub y crea un proyecto Vercel importando ese repositorio. El `vercel.json` selecciona Frankfurt (`fra1`) como región de las funciones.
2. Añade una base de datos Neon desde Vercel Marketplace (o crea Neon por separado) y copia la URL pooled a `DATABASE_URL`.
3. Añade estas variables en **Vercel → Settings → Environment Variables**:
   - `APP_PASSWORD_HASH` (salida de `npm run auth:hash`)
   - `AUTH_SECRET` (aleatorio, 48 bytes como mínimo)
   - `DATABASE_URL` (Neon pooled connection string)
   - `CRON_SECRET` (aleatorio)
   - Si activas Google: `GOOGLE_HEALTH_API_ENABLED=true`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI=https://TU-DOMINIO.vercel.app/api/google/callback`, `GOOGLE_TOKEN_ENCRYPTION_KEY`.
4. Antes del primer despliegue, crea el esquema en Neon ejecutando el contenido de `drizzle/0000_initial.sql` en el SQL Editor de Neon o usa `npm run db:migrate` con `DATABASE_URL` configurada.
5. Despliega. El cron configurado en `vercel.json` solicita una sincronización diaria a las 07:00 UTC. En Hobby el disparo puede producirse en cualquier momento dentro de esa hora.

### Importante sobre Vercel

- No uses SQLite ni el disco de la función para persistir datos.
- El límite del body de Vercel Functions es 4.5 MB. El importador evita ese límite: extrae ZIP en el cliente (máximo 250 MB por archivo en esta versión) y manda lotes pequeños de hasta 250 registros, sin adjuntar el JSON original de cada medición.
- No se sube el archivo ZIP original a Vercel Blob por defecto, evitando conservar copias completas de información de salud. Selecciona también Frankfurt para la base Neon. La región de ejecución no garantiza por sí sola que Vercel y todos sus proveedores procesen datos exclusivamente dentro de la UE; revisa sus términos y el acuerdo de tratamiento antes de almacenar información especialmente sensible.
- El proyecto puede tener tráfico público, pero el middleware protege las páginas y rutas API con la contraseña de propietario. Mantén una contraseña fuerte y no compartas el secreto.

## Google Health API

1. Sigue el [setup oficial de Google Health](https://developers.google.com/health/setup) y activa Google Health API en Google Cloud.
2. Crea un OAuth Client ID de tipo Web application y registra la URL exacta de callback que se configure en `GOOGLE_REDIRECT_URI`.
3. En Data Access habilita estos scopes de solo lectura:
   - `https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly`
   - `https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly`
   - `https://www.googleapis.com/auth/googlehealth.sleep.readonly`
4. Configura la pantalla de consentimiento y añade tu cuenta como usuario de prueba mientras la app esté en modo Testing.
5. Configura las variables Google en Vercel y vuelve a desplegar.
6. En el dashboard, abre **Conexiones → Conectar Google**.

Google clasifica los scopes de Google Health como restringidos y puede exigir revisión de OAuth/seguridad, especialmente para ofrecer la app públicamente. La API Fitbit Web heredada se apagó el 2 de noviembre de 2026; este proyecto usa Google Health API v4 y no depende de los endpoints Fitbit antiguos.

### Sincronización

- Botón manual en el dashboard y en Conexiones.
- Cron diario de recuperación en Vercel.
- `src/app/api/google/webhook/route.ts` está reservado y devuelve 503 hasta implementar y validar el subscriber de Google Health y su autenticación. No se debe registrar como subscriber todavía.

## Importación de históricos

1. Exporta Google Health desde [Google Takeout](https://takeout.google.com/).
2. Entra en **Importar datos** y selecciona el ZIP. La página conserva el historial de trabajos y muestra los ficheros ya procesados.
3. El navegador extrae entradas JSON/CSV y busca campos de fecha y métricas compatibles.
4. Los datos reconocidos se normalizan y envían en lotes a la API.
5. La clave SHA-256 de cada registro se calcula con métrica, instante, valor y unidad para deduplicar entre Takeout y Google Health cuando sus unidades coinciden; el SHA-256 del ZIP evita volver a procesar un archivo completo.

El formato de Takeout puede variar por tipo de dato, idioma y versión de Google. El parser usa heurísticas conservadoras y omite registros que no pueda identificar con seguridad. El importador limita el tamaño a 250 MB porque calcula SHA-256 del archivo en el navegador y mantiene entradas descomprimidas en memoria. Para adaptar el importador a tu exportación real, conviene probar con tu ZIP y ampliar los mapeos basándose en archivos concretos, sin compartir públicamente datos privados.

## Endpoints principales

| Método | Ruta | Función |
|---|---|---|
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/logout` | Cerrar sesión |
| GET | `/api/summary` | Métricas agregadas |
| GET | `/api/records` | Consultar registros |
| POST | `/api/import/start` | Crear trabajo de importación |
| POST | `/api/import/batch` | Guardar un lote normalizado |
| POST | `/api/import/complete` | Finalizar importación |
| GET | `/api/export/csv` | Exportar histórico CSV |
| GET | `/api/google/connect` | Iniciar OAuth |
| GET | `/api/google/callback` | Callback OAuth |
| POST | `/api/google/sync` | Sincronización manual |
| `POST /api/google/disconnect` | Revocar y eliminar los tokens de Google |
| GET | `/api/cron/google-sync` | Sincronización programada con `CRON_SECRET` |

## Limitaciones conocidas del MVP

- El parser de Google Takeout es heurístico. Un ZIP real permitirá mejorar cobertura y precisión de nombres/campos.
- La sincronización Google Health consulta un conjunto inicial de tipos de datos y una ventana móvil de 30 días; la recuperación completa histórica debe ejecutarse por tramos para evitar timeouts y límites de paginación.
- Los datos de sueño se guardan como duración resumida si el formato ofrece ese valor; no se calculan fases si no vienen explícitas.
- El conector de webhooks no se activa automáticamente: primero hay que configurar subscriber, suscripción y validación de notificaciones conforme a Google. El cron diario llama directamente al mismo servicio de sincronización y valida `CRON_SECRET`; no depende de una cookie de usuario.
- Los valores numéricos y tablas de salud se guardan en la base de datos del proyecto. Protege el acceso a Neon/Vercel y aplica las políticas de privacidad que correspondan si se comparte la app.

## Licencia

Uso privado. Revisa las condiciones de Google Health API antes de distribuir este proyecto o aceptar usuarios adicionales.
