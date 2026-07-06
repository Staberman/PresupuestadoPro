import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UnitCode } from '@/lib/documents';

export interface Service {
  id?:        string;
  name:       string;
  desc:       string;
  unit:       UnitCode;
  price:      number;
  category:   string;
  active:     boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export async function getServices(userId: string): Promise<Service[]> {
  const q = query(
    collection(db, 'users', userId, 'services'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Service));
}

export async function createService(userId: string, data: Service): Promise<string> {
  const ref = await addDoc(collection(db, 'users', userId, 'services'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateService(userId: string, serviceId: string, data: Partial<Service>): Promise<void> {
  await updateDoc(doc(db, 'users', userId, 'services', serviceId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteService(userId: string, serviceId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'services', serviceId));
}
