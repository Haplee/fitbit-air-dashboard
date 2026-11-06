# Modelo de datos

## `health_records`

Cada observación normalizada se guarda como un registro independiente:
- `metric`: tipo canónico (`steps`, `heart_rate`, `hrv`, `sleep`, etc.).
- `value`, `unit`: valor y unidad de origen normalizada.
- `measured_at`, `end_at`: instante o intervalo observado.
- `source`: `takeout` o `google_health`.
- `source_file`, `label`, `metadata`: procedencia y contexto mínimo.
- `dedupe_key`: SHA-256 para idempotencia.

## `import_jobs`

Registro de cada ZIP procesado. Guarda hash del archivo, recuentos, estado y fechas. El ZIP original no se conserva.

## `google_connections`

Tokens OAuth cifrados con AES-256-GCM. La clave de cifrado se guarda solo en variables de entorno y no se almacena junto a los tokens.

## Fechas

Las fechas se almacenan con zona horaria (`timestamptz`). La agregación diaria de dashboard usa `Europe/Madrid`.
