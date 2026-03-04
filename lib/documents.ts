import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, query, where, orderBy, serverTimestamp, getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type DocStatus = 'draft' | 'pending' | 'accepted' | 'rejected' | 'expired' | 'paid';
export type DocType   = 'presupuesto' | 'factura';

export interface DocItem {
  desc:  string;
  qty:   number;
  price: number;
  disc:  number;
}

export interface Document {
  id?:          string;
  type:         DocType;
  num:          string;
  status:       DocStatus;
  clientName:   string;
  clientEmail:  string;
  clientPhone:  string;
  clientAddr:   string;
  items:        DocItem[];
  notes:        string;
  discount:     number;
  ivaRate:      number;
  dateIssue:    string;
  dateExpiry:   string;
  fromDocId?:   string; // if this invoice came from a quote
  createdAt?:   any;
  updatedAt?:   any;
}

export async function getDocuments(userId: string): Promise<Document[]> {
  const q = query(
    collection(db, 'users', userId, 'documents'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Document));
}

export async function createDocument(userId: string, data: Document, plan: string): Promise<string> {
  // Server-side plan enforcement
  if (plan === 'free') {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
    const q = query(
      collection(db, 'users', userId, 'documents'),
      where('monthKey', '==', monthKey)
    );
    const snap = await getDocs(q);
    if (snap.size >= 50) {
      throw new Error('LIMIT_REACHED');
    }
  }

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;

  const ref = await addDoc(collection(db, 'users', userId, 'documents'), {
    ...data,
    monthKey,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDocument(userId: string, docId: string, data: Partial<Document>): Promise<void> {
  await updateDoc(doc(db, 'users', userId, 'documents', docId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDocument(userId: string, docId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'documents', docId));
}

export async function convertToInvoice(userId: string, quoteId: string, nextNum: string): Promise<string> {
  const snap = await getDoc(doc(db, 'users', userId, 'documents', quoteId));
  if (!snap.exists()) throw new Error('Quote not found');

  const quote = snap.data() as Document;

  // Create invoice linked to quote
  const invoiceId = await createDocument(userId, {
    ...quote,
    type:       'factura',
    num:        nextNum,
    status:     'pending',
    fromDocId:  quoteId,
  }, 'pro'); // conversion always allowed

  // Mark quote as accepted
  await updateDocument(userId, quoteId, { status: 'accepted' });

  return invoiceId;
}

export function calcTotal(doc: Document): number {
  const sub = doc.items.reduce((a, it) => {
    const line = it.qty * it.price;
    return a + line - line * (it.disc || 0) / 100;
  }, 0);
  return (sub - sub * (doc.discount || 0) / 100) * (1 + (doc.ivaRate || 0) / 100);
}