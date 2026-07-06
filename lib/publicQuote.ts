import {
  doc, setDoc, getDoc, updateDoc, serverTimestamp, deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Document } from '@/lib/documents';

export interface PublicQuote {
  token:       string;
  ownerUid:    string;
  docId:       string;
  doc:         Document;       // snapshot del presupuesto al generar el link
  biz: {
    name:     string;
    address:  string;
    phone:    string;
    email:    string;
    cuit:     string;
    currency: string;
    footer:   string;
  };
  status:      'pending' | 'accepted' | 'rejected';
  clientNote?: string;
  signedBy?:   string;
  signedAt?:   string;
  createdAt?:  unknown;
  updatedAt?:  unknown;
}

// Genera un token aleatorio seguro
export function generateToken(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnopqrstuvwxyz23456789';
  let out = '';
  const arr = new Uint32Array(length);
  const cryptoObj: Crypto = (typeof globalThis !== 'undefined' && (globalThis as { crypto?: Crypto }).crypto) || (window as { crypto?: Crypto }).crypto!;
  cryptoObj.getRandomValues(arr);
  for (let i = 0; i < length; i++) out += chars[arr[i] % chars.length];
  return out;
}

export async function getPublicQuote(token: string): Promise<PublicQuote | null> {
  const snap = await getDoc(doc(db, 'publicQuotes', token));
  if (!snap.exists()) return null;
  return snap.data() as PublicQuote;
}

// Publica el quote y lo indexa también por token para lookup O(1)
export async function publishQuoteIndexed(
  ownerUid: string,
  document: Document,
  biz: PublicQuote['biz'],
): Promise<string> {
  const docId = document.id!;
  const existingSnap = await getDoc(doc(db, 'quoteTokens', docId));
  let token: string;
  if (existingSnap.exists()) {
    token = (existingSnap.data() as PublicQuote).token;
  } else {
    token = generateToken();
  }
  const payload = {
    token,
    ownerUid,
    docId,
    doc: document,
    biz,
    status: 'pending' as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  // index por docId (para re-publicar sin duplicar)
  await setDoc(doc(db, 'quoteTokens', docId), payload, { merge: true });
  // index por token (para lookup público O(1))
  await setDoc(doc(db, 'publicQuotes', token), payload, { merge: true });
  return token;
}

export async function respondPublicQuote(
  token: string,
  response: 'accepted' | 'rejected',
  clientNote?: string,
  signedBy?: string,
): Promise<void> {
  const ref = doc(db, 'publicQuotes', token);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Token no encontrado');
  const data = snap.data() as PublicQuote;
  const now = new Date().toISOString();
  const update = {
    status: response,
    clientNote: clientNote || '',
    signedBy: signedBy || '',
    signedAt: now,
    updatedAt: serverTimestamp(),
  };
  // Actualizar snapshot público
  await updateDoc(ref, update);
  // Sincronizar con index por docId
  await updateDoc(doc(db, 'quoteTokens', data.docId), update);
  // Actualizar el documento original del dueño
  await updateDoc(
    doc(db, 'users', data.ownerUid, 'documents', data.docId),
    {
      status: response === 'accepted' ? 'aceptado' : 'rechazado',
      clientNote: clientNote || '',
      signedBy: signedBy || '',
      signedAt: now,
      updatedAt: serverTimestamp(),
    }
  );
}

export async function unpublishQuote(docId: string): Promise<void> {
  const snap = await getDoc(doc(db, 'quoteTokens', docId));
  if (!snap.exists()) return;
  const token = (snap.data() as PublicQuote).token;
  await deleteDoc(doc(db, 'quoteTokens', docId));
  await deleteDoc(doc(db, 'publicQuotes', token));
}
