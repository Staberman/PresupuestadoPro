import { supabase } from '@/lib/supabase';
import { mapError, mapRows, mapRow, toDb } from '@/lib/supabase-helpers';
import { getDocuments, calcTotal, type Document, type DocType } from '@/lib/documents';

export interface Payment {
  id?:        string;
  amount:     number;
  date:       string;
  method:     string;
  note:       string;
  createdAt?: string;
  updatedAt?: string;
}

export const PAYMENT_METHODS = [
  'Efectivo',
  'Transferencia',
  'Tarjeta',
  'Cheque',
  'Otro',
];

export async function getPayments(docId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('document_id', docId)
    .order('date', { ascending: false });
  if (error) mapError(error, 'getPayments');
  return mapRows<Payment>(data as Record<string, unknown>[]);
}

export async function addPayment(docId: string, data: Payment): Promise<string> {
  const dbData = toDb(data as unknown as Record<string, unknown>);
  dbData.document_id = docId;
  const { data: row, error } = await supabase
    .from('payments')
    .insert(dbData)
    .select('id')
    .single();
  if (error) mapError(error, 'addPayment');
  return row!.id;
}

export async function updatePayment(docId: string, paymentId: string, data: Partial<Payment>): Promise<void> {
  const { error } = await supabase
    .from('payments')
    .update(toDb(data as unknown as Record<string, unknown>))
    .eq('id', paymentId)
    .eq('document_id', docId);
  if (error) mapError(error, 'updatePayment');
}

export async function deletePayment(docId: string, paymentId: string): Promise<void> {
  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', paymentId)
    .eq('document_id', docId);
  if (error) mapError(error, 'deletePayment');
}

export function totalPaid(payments: Payment[]): number {
  return payments.reduce((a, p) => a + (p.amount || 0), 0);
}

export async function suggestNextNumber(type: DocType): Promise<string> {
  const docs = await getDocuments();
  const prefix = type === 'presupuesto' ? 'P' : 'F';
  const sameType = docs.filter(d => d.type === type);
  let maxNum = 0;
  sameType.forEach(d => {
    const m = (d.num || '').match(new RegExp(`^${prefix}[-]?(\\d+)`, 'i'));
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  });
  const next = maxNum + 1;
  return `${prefix}-${String(next).padStart(4, '0')}`;
}

export interface MonthlyIncome {
  key:        string;
  label:      string;
  facturado:  number;
  cobrado:    number;
  pendiente:  number;
}

export function computeMonthlyIncome(docs: Document[], paymentsByDoc: Record<string, Payment[]>): MonthlyIncome[] {
  const map = new Map<string, MonthlyIncome>();
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  function getMonth(dateStr: string): MonthlyIncome | null {
    if (!dateStr) return null;
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return null;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
        facturado: 0,
        cobrado: 0,
        pendiente: 0,
      });
    }
    return map.get(key)!;
  }

  docs.filter(d => d.type === 'factura').forEach(d => {
    const m = getMonth(d.dateIssue);
    if (m) m.facturado += calcTotal(d);
  });

  Object.values(paymentsByDoc).forEach(pays => {
    pays.forEach(p => {
      const m = getMonth(p.date);
      if (m) m.cobrado += p.amount || 0;
    });
  });

  map.forEach(m => { m.pendiente = Math.max(0, m.facturado - m.cobrado); });

  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}
