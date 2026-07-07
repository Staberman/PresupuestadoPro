import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type FiscalCondition = 'consumidor_final' | 'monotributo' | 'responsable_inscripto' | 'exento' | 'otro';

export const FISCAL_CONDITIONS: { code: FiscalCondition; label: string }[] = [
  { code: 'consumidor_final',     label: 'Consumidor Final' },
  { code: 'monotributo',          label: 'Monotributo' },
  { code: 'responsable_inscripto',label: 'Responsable Inscripto' },
  { code: 'exento',               label: 'Exento' },
  { code: 'otro',                 label: 'Otro' },
];

export interface Client {
  id?:              string;
  name:             string;
  email:            string;
  phone:            string;
  addr:             string;
  tags:             string;
  notes:            string;
  company?:         string;
  cuit?:            string;
  fiscalCondition?: FiscalCondition;
  sector?:          string;
  contactName?:     string;
  contactRole?:     string;
  createdAt?:       unknown;
  updatedAt?:       unknown;
}

export async function getClients(userId: string): Promise<Client[]> {
  const q = query(
    collection(db, 'users', userId, 'clients'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Client));
}

export async function createClient(userId: string, data: Client): Promise<string> {
  const ref = await addDoc(collection(db, 'users', userId, 'clients'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateClient(userId: string, clientId: string, data: Partial<Client>): Promise<void> {
  await updateDoc(doc(db, 'users', userId, 'clients', clientId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteClient(userId: string, clientId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'clients', clientId));
}