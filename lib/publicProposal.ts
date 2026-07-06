import {
  doc, setDoc, getDoc, updateDoc, serverTimestamp, deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Proposal } from '@/lib/proposals';

export interface PublicProposal {
  token:         string;
  ownerUid:      string;
  proposalId:    string;
  proposal:      Proposal;
  whatsappPhone: string;
  status:        'pending' | 'aprobado' | 'postergado' | 'rechazado';
  signedBy?:     string;
  signedAt?:     string;
  clientNote?:   string;
  postergarUntil?: string;
  createdAt?:    unknown;
  updatedAt?:    unknown;
}

export function generateToken(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnopqrstuvwxyz23456789';
  let out = '';
  const arr = new Uint32Array(length);
  const cryptoObj: Crypto = (typeof globalThis !== 'undefined' && (globalThis as { crypto?: Crypto }).crypto) || (window as { crypto?: Crypto }).crypto!;
  cryptoObj.getRandomValues(arr);
  for (let i = 0; i < length; i++) out += chars[arr[i] % chars.length];
  return out;
}

export async function getPublicProposal(token: string): Promise<PublicProposal | null> {
  const snap = await getDoc(doc(db, 'publicProposals', token));
  if (!snap.exists()) return null;
  return snap.data() as PublicProposal;
}

export async function publishProposal(
  ownerUid: string,
  proposal: Proposal,
  whatsappPhone: string,
): Promise<string> {
  const proposalId = proposal.id!;
  const existingSnap = await getDoc(doc(db, 'proposalTokens', proposalId));
  let token: string;
  if (existingSnap.exists()) {
    token = (existingSnap.data() as PublicProposal).token;
  } else {
    token = generateToken();
  }
  const payload = {
    token,
    ownerUid,
    proposalId,
    proposal,
    whatsappPhone,
    status: 'pending' as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, 'proposalTokens', proposalId), payload, { merge: true });
  await setDoc(doc(db, 'publicProposals', token), payload, { merge: true });
  return token;
}

export async function respondPublicProposal(
  token: string,
  response: 'aprobado' | 'postergado' | 'rechazado',
  signedBy?: string,
  clientNote?: string,
): Promise<void> {
  const ref = doc(db, 'publicProposals', token);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Token no encontrado');
  const data = snap.data() as PublicProposal;
  const now = new Date().toISOString();
  const update: Partial<PublicProposal> = {
    status: response,
    signedBy: signedBy || '',
    signedAt: now,
    clientNote: clientNote || '',
    updatedAt: serverTimestamp(),
  };
  if (response === 'postergado') {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    update.postergarUntil = d.toISOString().split('T')[0];
  }
  await updateDoc(ref, update as Record<string, unknown>);
  await updateDoc(doc(db, 'proposalTokens', data.proposalId), update as Record<string, unknown>);
  // Actualizar la propuesta original
  const proposalUpdate: Partial<Proposal> = {
    status: response,
    signedBy: signedBy || '',
    signedAt: now,
    clientNote: clientNote || '',
  };
  if (response === 'postergado') {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    proposalUpdate.postergarUntil = d.toISOString().split('T')[0];
  }
  await updateDoc(
    doc(db, 'users', data.ownerUid, 'proposals', data.proposalId),
    { ...proposalUpdate, updatedAt: serverTimestamp() } as Record<string, unknown>
  );
}

export async function unpublishProposal(proposalId: string): Promise<void> {
  const snap = await getDoc(doc(db, 'proposalTokens', proposalId));
  if (!snap.exists()) return;
  const token = (snap.data() as PublicProposal).token;
  await deleteDoc(doc(db, 'proposalTokens', proposalId));
  await deleteDoc(doc(db, 'publicProposals', token));
}
