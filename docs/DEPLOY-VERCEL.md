# Despliegue detallado en Vercel

## 1. Neon

- En Vercel, abre Storage / Marketplace e instala Neon.
- Crea una base de datos en Frankfurt (`eu-central-1`) para acercarla a las funciones de Vercel desplegadas en `fra1`.
- Copia la cadena de conexión pooled (`DATABASE_URL`).
- Ejecuta `drizzle/0000_initial.sql` en el editor SQL de Neon.

## 2. Variables

| Variable | Obligatoria | Descripción |
|---|---|---|
| `APP_PASSWORD_HASH` | Sí | Hash bcrypt de la contraseña propietaria |
| `AUTH_SECRET` | Sí | Secreto JWT largo y aleatorio |
| `DATABASE_URL` | Sí | Neon PostgreSQL pooled URL |
| `CRON_SECRET` | Recomendable | Protege el endpoint de cron |
| `GOOGLE_HEALTH_API_ENABLED` | No | `true` para mostrar el botón de conexión |
| `GOOGLE_CLIENT_ID` | No | OAuth Web Client ID |
| `GOOGLE_CLIENT_SECRET` | No | OAuth Web Client Secret |
| `GOOGLE_REDIRECT_URI` | No | Callback OAuth exacto |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | No | Clave base64 de 32 bytes para AES-256-GCM |

## 3. Callback OAuth

Para el entorno de producción:

`https://TU-PROYECTO.vercel.app/api/google/callback`

Añádelo en los redirect URIs autorizados del cliente OAuth, y configura la misma cadena en `GOOGLE_REDIRECT_URI`. No uses el dominio de preview para autorizar cuentas de producción.

## 4. Primer despliegue

Despliega una vez con Google desactivado, verifica login, base de datos e importación. Después activa Google Health y configura OAuth. Haz un redeploy tras cambiar variables de entorno.

## 5. Cron

`vercel.json` invoca `/api/cron/google-sync` una vez al día. Vercel Hobby solo admite cron diario con precisión horaria; un cron de mayor frecuencia requiere un plan compatible.


## 6. Importación grande sin superar el límite de Vercel

El navegador abre el ZIP con zip.js; el archivo no se envía a una Function ni se guarda en Blob. La versión inicial limita el ZIP a 250 MB por el uso de memoria del navegador. Los registros se normalizan en el cliente y se transmiten en lotes de 250, con metadatos reducidos para mantener cada solicitud por debajo del límite de 4,5 MB.

## 7. Seguridad de OAuth callback y cron

`/api/google/callback` es una ruta pública únicamente para permitir el retorno desde Google; valida el parámetro `state` contra una cookie `HttpOnly`, `SameSite=Lax`, de corta duración. El resto de las rutas de la aplicación requieren la cookie de sesión privada. `/api/cron/google-sync` es una ruta pública solo a nivel de middleware y exige `Authorization: Bearer $CRON_SECRET`.


## 8. Región y privacidad

`vercel.json` establece `fra1` (Frankfurt) para las funciones. Crea la base Neon en `eu-central-1`. Esta colocación reduce latencia y mantiene la infraestructura principal de ejecución/base de datos en Europa, pero no es una garantía de que Vercel y todos sus proveedores traten los datos exclusivamente dentro de la UE. Revisa el DPA, los términos de Google y las condiciones de los proveedores antes de cargar datos de salud.
