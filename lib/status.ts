import type { DocStatus } from '@/lib/documents';

export interface StatusMeta {
  label: string;
  color: string;
  bg: string;
}

export const STATUS_META: Record<DocStatus, StatusMeta> = {
  draft:     { label: 'Borrador',  color: '#7888a8', bg: '#f0f4ff' },
  enviado:   { label: 'Enviado',   color: '#b45309', bg: '#fef3c7' },
  aceptado:  { label: 'Aceptado',  color: '#0a7c4b', bg: '#d1fae5' },
  rechazado: { label: 'Rechazado', color: '#c41c1c', bg: '#fee2e2' },
  vencido:   { label: 'Vencido',   color: '#c41c1c', bg: '#fee2e2' },
  facturado: { label: 'Facturado', color: '#0e7490', bg: '#cffafe' },
  paid:      { label: 'Cobrado',   color: '#0a7c4b', bg: '#d1fae5' },
};

// 'pending' legacy -> 'enviado', 'accepted' legacy -> 'aceptado',
// 'rejected' legacy -> 'rechazado', 'expired' legacy -> 'vencido'
export function normalizeStatus(status: string): DocStatus {
  if (status === 'pending') return 'enviado';
  if (status === 'accepted') return 'aceptado';
  if (status === 'rejected') return 'rechazado';
  if (status === 'expired') return 'vencido';
  return status as DocStatus;
}

export function statusLabel(status: string): string {
  return STATUS_META[normalizeStatus(status)].label;
}

export function statusMeta(status: string): StatusMeta {
  return STATUS_META[normalizeStatus(status)];
}

// Marca como 'vencido' los presupuestos cuya fecha de vencimiento ya pasó
// y que siguen en borrador/enviado. Devuelve true si cambió.
export function shouldExpire(status: DocStatus, dateExpiry: string): boolean {
  if (status !== 'draft' && status !== 'enviado') return false;
  if (!dateExpiry) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateExpiry + 'T00:00:00');
  return expiry < today;
}
