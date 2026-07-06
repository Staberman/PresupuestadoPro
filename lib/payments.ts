import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getDocuments, calcTotal, Document, DocType } from '@/lib/documents';

export interface Payment {
  id?:        string;
  amount:     number;
  date:       string;
  method:     string;
  note:       string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export const PAYMENT_METHODS = [
  'Efectivo',
  'Transferencia',
  'Tarjeta',
  'MercadoPago',
  'Cheque',
  'Otro',
];

export async function getPayments(userId: string, docId: string): Promise<Payment[]> {
  const q = query(
    collection(db, 'users', userId, 'documents', docId, 'payments'),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
}

export async function addPayment(userId: string, docId: string, data: Payment): Promise<string> {
  const ref = await addDoc(collection(db, 'users', userId, 'documents', docId, 'payments'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePayment(userId: string, docId: string, paymentId: string, data: Partial<Payment>): Promise<void> {
  await updateDoc(doc(db, 'users', userId, 'documents', docId, 'payments', paymentId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePayment(userId: string, docId: string, paymentId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'documents', docId, 'payments', paymentId));
}

// Total ya pagado de un documento
export function totalPaid(payments: Payment[]): number {
  return payments.reduce((a, p) => a + (p.amount || 0), 0);
}

// Sugiere el próximo número para un tipo de documento (P-0001, F-0001, ...)
// basándose en los existentes. Devuelve un string formateado.
export async function suggestNextNumber(userId: string, type: DocType): Promise<string> {
  const docs = await getDocuments(userId);
  const prefix = type === 'presupuesto' ? 'P' : 'F';
  const sameType = docs.filter(d => d.type === type);
  let maxNum = 0;
  sameType.forEach(d => {
    // Extrae el número secuencial de strings tipo "P-0001" o "P-001"
    const m = (d.num || '').match(new RegExp(`^${prefix}[-]?(\\d+)`, 'i'));
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  });
  const next = maxNum + 1;
  return `${prefix}-${String(next).padStart(4, '0')}`;
}

// Helpers para reportes de ingresos
export interface MonthlyIncome {
  key:        string; // YYYY-MM
  label:      string; // "Ene 2026"
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

  // Facturas: sumar al facturado del mes de emisión
  docs.filter(d => d.type === 'factura').forEach(d => {
    const m = getMonth(d.dateIssue);
    if (m) m.facturado += calcTotal(d);
  });

  // Pagos: sumar al cobrado del mes del pago
  Object.values(paymentsByDoc).forEach(pays => {
    pays.forEach(p => {
      const m = getMonth(p.date);
      if (m) m.cobrado += p.amount || 0;
    });
  });

  // Pendiente por mes = facturado ese mes - cobrado ese mes
  map.forEach(m => { m.pendiente = Math.max(0, m.facturado - m.cobrado); });

  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}
