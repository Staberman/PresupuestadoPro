import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { calcTotal, Document } from '@/lib/documents';
import { totalPaid, Payment, getPayments } from '@/lib/payments';

export type ProjectStatus = 'borrador' | 'en_curso' | 'completado' | 'pausado' | 'cancelado';

export const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; color: string; bg: string }> = {
  borrador:   { label: 'Borrador',   color: '#7888a8', bg: '#f0f4ff' },
  en_curso:   { label: 'En curso',   color: '#1a56e8', bg: '#e0e7ff' },
  completado: { label: 'Completado', color: '#0a7c4b', bg: '#d1fae5' },
  pausado:    { label: 'Pausado',    color: '#b45309', bg: '#fef3c7' },
  cancelado:  { label: 'Cancelado',  color: '#c41c1c', bg: '#fee2e2' },
};

export const PROJECT_STATUSES: ProjectStatus[] = ['borrador', 'en_curso', 'completado', 'pausado', 'cancelado'];

export interface Project {
  id?:          string;
  name:         string;
  clientId?:    string;
  clientName?:  string;
  description:  string;
  status:       ProjectStatus;
  dateStart:    string;
  dateDue:      string;
  progress:     number;
  budget:       number;
  notes:        string;
  docIds:       string[];
  createdAt?:   unknown;
  updatedAt?:   unknown;
}

export async function getProjects(userId: string): Promise<Project[]> {
  const q = query(
    collection(db, 'users', userId, 'projects'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Project));
}

export async function getProject(userId: string, projectId: string): Promise<Project | null> {
  const snap = await getDoc(doc(db, 'users', userId, 'projects', projectId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Project;
}

export async function createProject(userId: string, data: Project): Promise<string> {
  const ref = await addDoc(collection(db, 'users', userId, 'projects'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProject(userId: string, projectId: string, data: Partial<Project>): Promise<void> {
  await updateDoc(doc(db, 'users', userId, 'projects', projectId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProject(userId: string, projectId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'projects', projectId));
}

// Calcula el monto facturado y cobrado de un proyecto en base a sus docs vinculados
export interface ProjectFinancials {
  facturado: number;
  cobrado:   number;
  documentos: Document[];
}

export async function computeProjectFinancials(
  userId: string,
  project: Project,
  allDocs: Document[],
): Promise<ProjectFinancials> {
  const documentos = allDocs.filter(d => project.docIds?.includes(d.id!));
  const facturado = documentos
    .filter(d => d.type === 'factura')
    .reduce((a, d) => a + calcTotal(d), 0);
  // cobrado: sumar pagos de las facturas vinculadas
  const invoices = documentos.filter(d => d.type === 'factura' && d.id);
  let cobrado = 0;
  await Promise.all(
    invoices.map(async d => {
      const pays: Payment[] = await getPayments(userId, d.id!);
      cobrado += totalPaid(pays);
    })
  );
  return { facturado, cobrado, documentos };
}
