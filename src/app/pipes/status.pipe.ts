import { Pipe, PipeTransform } from '@angular/core';

export interface StatusDisplay {
  color: string;
  label: string;
}

const STATUS_MAP: Record<string, StatusDisplay> = {
  ACTIVE: { color: 'bg-success', label: 'Activo' },
  INACTIVE: { color: 'bg-base-content/30', label: 'Inactivo' },
  BLOCKED: { color: 'bg-base-content/30', label: 'Bloqueado' },
  EXPIRED: { color: 'bg-error', label: 'Expirado' },
  DELETED: { color: 'bg-base-content/30', label: 'Eliminado' },
  PAUSED: { color: 'bg-info', label: 'Pausado' },
  CLOSED: { color: 'bg-base-content/30', label: 'Cerrado' },
  AVAILABLE: { color: 'bg-success', label: 'Disponible' },
  SOLD: { color: 'bg-error', label: 'Vendido' },
  NOT_APPLICABLE: { color: 'bg-base-content/30', label: 'N/A' },
  PENDING: { color: 'bg-error', label: 'Pendiente' },
  SENT: { color: 'bg-success', label: 'Enviado' },
};

@Pipe({ name: 'status', standalone: true })
export class StatusPipe implements PipeTransform {
  transform(value: string): StatusDisplay {
    return STATUS_MAP[value] ?? { color: 'bg-base-content/30', label: value };
  }
}

export interface AlertDisplay {
  badgeClass: string;
  label: string;
}

export function getAlertDisplay(
  days: number | null,
  status: string,
): AlertDisplay {
  if (days === null) return { badgeClass: 'badge-ghost', label: '—' };
  if (status === 'INACTIVE')
    return {
      badgeClass: 'badge-ghost',
      label: days < 0 ? `${Math.abs(days)}d vencida` : `${days}d`,
    };
  if (days < 0)
    return {
      badgeClass: 'badge-error opacity-60',
      label: `${Math.abs(days)}d vencida`,
    };
  if (days === 0) return { badgeClass: 'badge-error', label: 'Hoy' };
  if (days <= 3) return { badgeClass: 'badge-warning', label: `${days}d` };
  return { badgeClass: 'badge-success', label: `${days}d` };
}

@Pipe({ name: 'alert', standalone: true })
export class AlertPipe implements PipeTransform {
  transform(
    cutoffDate: string | null | undefined,
    status: string = '',
  ): AlertDisplay {
    if (!cutoffDate) return { badgeClass: 'badge-ghost', label: '—' };
    const d = new Date(cutoffDate);
    if (isNaN(d.getTime())) return { badgeClass: 'badge-ghost', label: '—' };

    // cutoffDate viene en UTC, normalizamos solo la fecha UTC
    const cutoff = Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
    );

    // today usa fecha LOCAL del usuario, no UTC
    const now = new Date();
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

    const days = Math.ceil((cutoff - today) / (1000 * 60 * 60 * 24));
    return getAlertDisplay(days, status);
  }
}

// =========================
// Paleta de colores pastel para etiquetas
// =========================

export const LABEL_COLORS: { name: string; bg: string; hex: string }[] = [
  { name: 'Lavanda', bg: 'bg-[#DDD6FE]', hex: '#DDD6FE' },
  { name: 'Amarillo', bg: 'bg-[#FEF08A]', hex: '#FEF08A' },
  { name: 'Durazno', bg: 'bg-[#FECACA]', hex: '#FECACA' },
  { name: 'Rosa', bg: 'bg-[#FBCFE8]', hex: '#FBCFE8' },
  { name: 'Naranja', bg: 'bg-[#FED7AA]', hex: '#FED7AA' },
  { name: 'Cielo', bg: 'bg-[#BAE6FD]', hex: '#BAE6FD' },
  { name: 'Lila', bg: 'bg-[#E9D5FF]', hex: '#E9D5FF' },
];

// =========================
// Profile dot color
// =========================
export function getProfileDotColor(
  profileStatus: string,
  saleStatus?: string | null,
  cutoffDate?: string | null,
  labelColor?: string | null, // ← nuevo parámetro
): string {
  // AVAILABLE — si tiene etiqueta usa su color, si no gris
  if (profileStatus === 'AVAILABLE') {
    if (labelColor) return `bg-[${labelColor}]`;
    return 'bg-base-300';
  }

  if (profileStatus === 'BLOCKED') return 'bg-base-content/30';

  // SOLD — color según estado de la venta
  if (saleStatus === 'PAUSED') return 'bg-info';
  if (saleStatus === 'EXPIRED') return 'bg-error opacity-60';
  if (saleStatus === 'CLOSED') return 'bg-base-content/30';

  // ACTIVE — color según días restantes
  if (!cutoffDate) return 'bg-success';
  const d = new Date(cutoffDate);
  const cutoff = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );

  const days = Math.ceil(
    (cutoff.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (days < 0) return 'bg-error opacity-60';
  if (days === 0) return 'bg-error';
  if (days <= 3) return 'bg-warning';
  return 'bg-success';
}

@Pipe({ name: 'colorName', standalone: true })
export class ColorNamePipe implements PipeTransform {
  transform(colors: { name: string; hex: string }[], hex: string): string {
    return colors.find((c) => c.hex === hex)?.name ?? hex;
  }
}
