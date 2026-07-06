import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type ProposalStatus = 'borrador' | 'enviado' | 'aprobado' | 'postergado' | 'rechazado';

export const PROPOSAL_STATUS_META: Record<ProposalStatus, { label: string; color: string; bg: string }> = {
  borrador:   { label: 'Borrador',     color: '#7888a8', bg: '#f0f4ff' },
  enviado:    { label: 'Enviado',      color: '#b45309', bg: '#fef3c7' },
  aprobado:   { label: 'Aprobado',     color: '#0a7c4b', bg: '#d1fae5' },
  postergado: { label: 'Postergado',   color: '#1a56e8', bg: '#e0e7ff' },
  rechazado:  { label: 'Rechazado',    color: '#c41c1c', bg: '#fee2e2' },
};

export const PROPOSAL_STATUSES: ProposalStatus[] = ['borrador', 'enviado', 'aprobado', 'postergado', 'rechazado'];

export interface ProposalSection {
  id:          string;
  title:       string;
  description: string;
  bullets:     string[];
  isInfo:      boolean; // true = sección informativa final (sin número)
}

export interface Proposal {
  id?:            string;
  num:            string;
  status:         ProposalStatus;
  title:          string;        // ej: "Campaña completa de marketing"
  clientName:     string;
  clientEmail:    string;
  clientPhone:    string;
  clientCompany?: string;
  sections:       ProposalSection[];
  totalAmount:    number;        // monto total único
  dateIssue:      string;
  whatsappPhone?: string;        // teléfono para el link de WhatsApp al pie
  notes?:         string;
  postergarUntil?: string;       // fecha límite si se postergó
  signedBy?:      string;
  signedAt?:      string;
  clientNote?:    string;
  templateId?:    string;
  createdAt?:     unknown;
  updatedAt?:     unknown;
}

export function newSection(isInfo = false): ProposalSection {
  return {
    id: Math.random().toString(36).slice(2, 9),
    title: '',
    description: '',
    bullets: [],
    isInfo,
  };
}

export async function getProposals(userId: string): Promise<Proposal[]> {
  const q = query(
    collection(db, 'users', userId, 'proposals'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Proposal));
}

export async function getProposal(userId: string, proposalId: string): Promise<Proposal | null> {
  const snap = await getDoc(doc(db, 'users', userId, 'proposals', proposalId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Proposal;
}

export async function createProposal(userId: string, data: Proposal): Promise<string> {
  const ref = await addDoc(collection(db, 'users', userId, 'proposals'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProposal(userId: string, proposalId: string, data: Partial<Proposal>): Promise<void> {
  await updateDoc(doc(db, 'users', userId, 'proposals', proposalId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProposal(userId: string, proposalId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'proposals', proposalId));
}

// Sugiere el próximo número PR-0001, PR-0002...
export async function suggestProposalNumber(userId: string): Promise<string> {
  const proposals = await getProposals(userId);
  let maxNum = 0;
  proposals.forEach(p => {
    const m = (p.num || '').match(/^PR[-]?(\d+)/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  });
  return `PR-${String(maxNum + 1).padStart(4, '0')}`;
}
