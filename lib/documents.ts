import { supabase } from '@/lib/supabase';
import { mapError, mapRows, mapRow, toDb } from '@/lib/supabase-helpers';

export type DocStatus = 'draft' | 'enviado' | 'aceptado' | 'rechazado' | 'vencido' | 'facturado' | 'paid';
export type DocType   = 'presupuesto' | 'factura';

export type UnitCode = 'hora' | 'dia' | 'semana' | 'proyecto' | 'unidad' | 'km' | 'mes';

export const UNITS: { code: UnitCode; label: string; singular: string; plural: string }[] = [
  { code: 'hora',     label: 'Horas',        singular: 'hora',     plural: 'horas' },
  { code: 'dia',      label: 'Días',         singular: 'día',      plural: 'días' },
  { code: 'semana',   label: 'Semanas',      singular: 'semana',   plural: 'semanas' },
  { code: 'proyecto', label: 'Proyecto',     singular: 'proyecto', plural: 'proyectos' },
  { code: 'unidad',   label: 'Unidades',     singular: 'unidad',   plural: 'unidades' },
  { code: 'km',       label: 'Kilómetros',   singular: 'km',       plural: 'kms' },
  { code: 'mes',      label: 'Meses',        singular: 'mes',      plural: 'meses' },
];

export function unitLabel(code: UnitCode | undefined, qty: number): string {
  const u = UNITS.find(x => x.code === code);
  if (!u) return '';
  return Math.abs(qty) === 1 ? u.singular : u.plural;
}

export interface SectionItem {
  id:    string;
  name:  string;
  price: number;
}

export interface ItemSection {
  id:    string;
  title: string;
  items: SectionItem[];
}

export interface Document {
  id?:                    string;
  type:                   DocType;
  num:                    string;
  status:                 DocStatus;
  clientName:             string;
  clientEmail:            string;
  clientPhone:            string;
  clientCompany?:         string;
  items:                  ItemSection[];
  notes:                  string;
  discount:               number;
  ivaRate:                number;
  dateIssue:              string;
  dateExpiry:             string;
  fromDocId?:             string;
  clientNote?:            string;
  signedBy?:              string;
  signedAt?:              string;
  createdAt?:             string;
  updatedAt?:             string;
}

export async function getDocuments(): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) mapError(error, 'getDocuments');
  return mapRows<Document>(data as Record<string, unknown>[]);
}

export async function getDocument(docId: string): Promise<Document | null> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', docId)
    .maybeSingle();
  if (error) mapError(error, 'getDocument');
  if (!data) return null;
  return mapRow<Document>(data as Record<string, unknown>);
}

export async function createDocument(data: Document): Promise<string> {
  const { data: row, error } = await supabase
    .from('documents')
    .insert(toDb(data as unknown as Record<string, unknown>))
    .select('id')
    .single();
  if (error) mapError(error, 'createDocument');
  return row!.id;
}

export async function updateDocument(docId: string, data: Partial<Document>): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .update(toDb(data as unknown as Record<string, unknown>))
    .eq('id', docId);
  if (error) mapError(error, 'updateDocument');
}

export async function deleteDocument(docId: string): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', docId);
  if (error) mapError(error, 'deleteDocument');
}

export async function convertToInvoice(docId: string, nextNum: string): Promise<void> {
  const doc = await getDocument(docId);
  if (!doc) throw new Error('Document not found');
  await updateDocument(docId, {
    type: 'factura',
    num: nextNum,
    status: 'enviado',
  });
}

export function calcSubtotal(doc: Document): number {
  return doc.items.reduce((a, sec) =>
    a + sec.items.reduce((b, it) => b + it.price, 0), 0);
}

export function calcTotal(doc: Document): number {
  const sub = calcSubtotal(doc);
  return (sub - sub * (doc.discount || 0) / 100) * (1 + (doc.ivaRate || 0) / 100);
}
