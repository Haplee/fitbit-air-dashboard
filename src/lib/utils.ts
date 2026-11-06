export function cn(...values: Array<string | false | null | undefined>) { return values.filter(Boolean).join(" "); }
export function formatNumber(value: number | null | undefined, maximumFractionDigits = 0) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits }).format(value);
}
export function formatDate(value: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("es-ES", options ?? { day: "2-digit", month: "short" }).format(new Date(value));
}
