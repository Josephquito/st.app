/**
 * Utilidades de fecha unificadas — SIEMPRE hora LOCAL del usuario.
 * Nunca usar getUTCFullYear/getUTCMonth/getUTCDate ni Date.UTC aquí.
 * Un usuario en UTC-5 a las 20:00 del 26 marzo ve 2026-03-26, no 2026-03-27.
 */

/** Fecha local del usuario en YYYY-MM-DD */
export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Date → YYYY-MM-DD en hora local */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * YYYY-MM-DD → Date en hora local (new Date(y, m-1, d)).
 * Acepta también strings con tiempo (ISO completo): toma solo la parte de fecha.
 * Retorna null si el string es inválido.
 */
export function parseISODate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const datePart = dateStr.split('T')[0];
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Suma días en hora local */
export function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/** Suma meses respetando el último día del mes, hora local */
export function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

/**
 * Días entre HOY local y cutoffDate.
 * - Positivo: quedan días.
 * - 0: vence hoy.
 * - Negativo: ya venció hace N días.
 * Compara solo fechas sin hora (ambas en medianoche local).
 */
export function daysRemaining(
  cutoffDateStr: string | null | undefined,
): number {
  if (!cutoffDateStr) return 0;
  const cutoff = parseISODate(cutoffDateStr);
  if (!cutoff) return 0;
  const today = parseISODate(todayISO())!;
  return Math.ceil(
    (cutoff.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

/**
 * true solo si cutoffDate < hoy local (ya pasó, no vence hoy).
 * false si vence hoy o en el futuro.
 */
export function isExpiredLocal(
  cutoffDateStr: string | null | undefined,
): boolean {
  if (!cutoffDateStr) return false;
  const cutoff = parseISODate(cutoffDateStr);
  if (!cutoff) return false;
  const today = parseISODate(todayISO())!;
  return cutoff.getTime() < today.getTime();
}

/** YYYY-MM-DD → dd/MM/yyyy para mostrar al usuario. Retorna '—' si es null/undefined/inválido. */
export function formatDisplay(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = parseISODate(dateStr);
  if (!d) return '—';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
