import { supabase } from '@/lib/supabase';
import { mapError, mapRows, mapRow, toDb } from '@/lib/supabase-helpers';
import { calcTotal, type Document } from '@/lib/documents';
import { totalPaid, type Payment, getPayments } from '@/lib/payments';

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
  createdAt?:   string;
  updatedAt?:   string;
}

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) mapError(error, 'getProjects');
  return mapRows<Project>(data as Record<string, unknown>[]);
}

export async function getProject(projectId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();
  if (error) mapError(error, 'getProject');
  if (!data) return null;
  return mapRow<Project>(data as Record<string, unknown>);
}

export async function createProject(data: Project): Promise<string> {
  const { data: row, error } = await supabase
    .from('projects')
    .insert(toDb(data as unknown as Record<string, unknown>))
    .select('id')
    .single();
  if (error) mapError(error, 'createProject');
  return row!.id;
}

export async function updateProject(projectId: string, data: Partial<Project>): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update(toDb(data as unknown as Record<string, unknown>))
    .eq('id', projectId);
  if (error) mapError(error, 'updateProject');
}

export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);
  if (error) mapError(error, 'deleteProject');
}

export interface ProjectFinancials {
  facturado: number;
  cobrado:   number;
  documentos: Document[];
}

export async function computeProjectFinancials(
  project: Project,
  allDocs: Document[],
): Promise<ProjectFinancials> {
  const documentos = allDocs.filter(d => project.docIds?.includes(d.id!));
  const facturado = documentos
    .filter(d => d.type === 'factura')
    .reduce((a, d) => a + calcTotal(d), 0);
  const invoices = documentos.filter(d => d.type === 'factura' && d.id);
  let cobrado = 0;
  await Promise.all(
    invoices.map(async d => {
      const pays: Payment[] = await getPayments(d.id!);
      cobrado += totalPaid(pays);
    })
  );
  return { facturado, cobrado, documentos };
}
