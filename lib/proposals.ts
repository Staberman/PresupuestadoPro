import { supabase } from '@/lib/supabase';
import { mapError, mapRows, mapRow, toDb } from '@/lib/supabase-helpers';

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
  isInfo:      boolean;
}

export interface Proposal {
  id?:            string;
  num:            string;
  status:         ProposalStatus;
  title:          string;
  clientName:     string;
  clientEmail:    string;
  clientPhone:    string;
  clientCompany?: string;
  sections:       ProposalSection[];
  totalAmount:    number;
  dateIssue:      string;
  whatsappPhone?: string;
  notes?:         string;
  postergarUntil?: string;
  signedBy?:      string;
  signedAt?:      string;
  clientNote?:    string;
  templateId?:    string;
  createdAt?:     string;
  updatedAt?:     string;
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

export async function getProposals(): Promise<Proposal[]> {
  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) mapError(error, 'getProposals');
  return mapRows<Proposal>(data as Record<string, unknown>[]);
}

export async function getProposal(proposalId: string): Promise<Proposal | null> {
  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', proposalId)
    .maybeSingle();
  if (error) mapError(error, 'getProposal');
  if (!data) return null;
  return mapRow<Proposal>(data as Record<string, unknown>);
}

export async function createProposal(data: Proposal): Promise<string> {
  const { data: row, error } = await supabase
    .from('proposals')
    .insert(toDb(data as unknown as Record<string, unknown>))
    .select('id')
    .single();
  if (error) mapError(error, 'createProposal');
  return row!.id;
}

export async function updateProposal(proposalId: string, data: Partial<Proposal>): Promise<void> {
  const { error } = await supabase
    .from('proposals')
    .update(toDb(data as unknown as Record<string, unknown>))
    .eq('id', proposalId);
  if (error) mapError(error, 'updateProposal');
}

export async function deleteProposal(proposalId: string): Promise<void> {
  const { error } = await supabase
    .from('proposals')
    .delete()
    .eq('id', proposalId);
  if (error) mapError(error, 'deleteProposal');
}

export async function suggestProposalNumber(): Promise<string> {
  const proposals = await getProposals();
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
