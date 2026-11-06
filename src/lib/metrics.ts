export const METRICS = {
  steps: { label: "Pasos", unit: "pasos", category: "activity" },
  heart_rate: { label: "Frecuencia cardíaca", unit: "lpm", category: "heart" },
  resting_heart_rate: { label: "Pulso en reposo", unit: "lpm", category: "heart" },
  hrv: { label: "Variabilidad cardíaca", unit: "ms", category: "heart" },
  sleep: { label: "Sueño", unit: "min", category: "sleep" },
  distance: { label: "Distancia", unit: "m", category: "activity" },
  calories: { label: "Calorías", unit: "kcal", category: "activity" },
  active_minutes: { label: "Minutos activos", unit: "min", category: "activity" },
  spo2: { label: "Oxígeno en sangre", unit: "%", category: "vitals" },
  respiratory_rate: { label: "Frecuencia respiratoria", unit: "rpm", category: "vitals" },
  weight: { label: "Peso", unit: "kg", category: "body" },
  vo2_max: { label: "VO₂ máx.", unit: "ml/kg/min", category: "heart" },
  exercise: { label: "Entrenamiento", unit: "min", category: "activity" },
} as const;

export type MetricKey = keyof typeof METRICS;
export type MetricRecordInput = {
  metric: MetricKey;
  value: number;
  unit: string;
  measuredAt: string;
  endAt?: string | null;
  source: "takeout" | "google_health";
  sourceFile?: string;
  label?: string;
  dedupeKey: string;
  metadata?: Record<string, unknown>;
};

export const metricLabels = Object.fromEntries(Object.entries(METRICS).map(([key, item]) => [key, item.label])) as Record<string, string>;
