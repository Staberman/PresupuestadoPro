import { supabase } from '@/lib/supabase';
import { mapError, mapRow, toDb } from '@/lib/supabase-helpers';
import type { Proposal } from '@/lib/proposals';
import { updateProposal } from '@/lib/proposals';

export interface PublicProposal {
  token:           string;
  proposalId:      string;
  proposal:        Proposal;
  whatsappPhone:   string;
  status:          'pending' | 'aprobado' | 'postergado' | 'rechazado';
  signedBy?:       string;
  signedAt?:       string;
  clientNote?:     string;
  postergarUntil?: string;
  createdAt?:      string;
  updatedAt?:      string;
}

export function generateToken(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnopqrstuvwxyz23456789';
  let out = '';
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) out += chars[arr[i] % chars.length];
  return out;
}

export async function getPublicProposal(token: string): Promise<PublicProposal | null> {
  const { data, error } = await supabase
    .from('public_proposals')
    .select('*')
    .eq('token', token)
    .maybeSingle();
  if (error) mapError(error, 'getPublicProposal');
  if (!data) return null;
  return mapRow<PublicProposal>(data as Record<string, unknown>);
}

export async function publishProposal(
  proposal: Proposal,
  whatsappPhone: string,
): Promise<string> {
  const proposalId = proposal.id!;

  // Check if already published
  const { data: existing } = await supabase
    .from('public_proposals')
    .select('token')
    .eq('proposal_id', proposalId)
    .maybeSingle();

  let token: string;
  if (existing) {
    token = existing.token;
  } else {
    token = generateToken();
  }

  const payload = {
    token,
    proposal_id: proposalId,
    proposal,
    whatsapp_phone: whatsappPhone,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('public_proposals')
    .upsert(payload, { onConflict: 'token' });
  if (error) mapError(error, 'publishProposal');

  return token;
}

export async function respondPublicProposal(
  token: string,
  response: 'aprobado' | 'postergado' | 'rechazado',
  signedBy?: string,
  clientNote?: string,
): Promise<void> {
  const { data: snap, error: getErr } = await supabase
    .from('public_proposals')
    .select('*')
    .eq('token', token)
    .maybeSingle();
  if (getErr) mapError(getErr, 'respondPublicProposal');
  if (!snap) throw new Error('Token no encontrado');

  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    status: response,
    signed_by: signedBy || '',
    signed_at: now,
    client_note: clientNote || '',
    updated_at: now,
  };
  if (response === 'postergado') {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    update.postergar_until = d.toISOString().split('T')[0];
  }

  const { error: updErr } = await supabase
    .from('public_proposals')
    .update(update)
    .eq('token', token);
  if (updErr) mapError(updErr, 'respondPublicProposal.update');

  // Update original proposal
  const proposalUpdate: Record<string, unknown> = {
    status: response,
    signed_by: signedBy || '',
    signed_at: now,
    client_note: clientNote || '',
    updated_at: now,
  };
  if (response === 'postergado') {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    proposalUpdate.postergar_until = d.toISOString().split('T')[0];
  }

  await updateProposal(snap.proposal_id, proposalUpdate as any);
}

export async function unpublishProposal(proposalId: string): Promise<void> {
  const { error } = await supabase
    .from('public_proposals')
    .delete()
    .eq('proposal_id', proposalId);
  if (error) mapError(error, 'unpublishProposal');
}
