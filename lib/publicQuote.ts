import { supabase } from '@/lib/supabase';
import { mapError, mapRow, toDb } from '@/lib/supabase-helpers';
import type { Document } from '@/lib/documents';
import { updateDocument } from '@/lib/documents';

export interface PublicQuote {
  token:       string;
  documentId:  string;
  document:    Document;
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
  createdAt?:  string;
  updatedAt?:  string;
}

export function generateToken(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnopqrstuvwxyz23456789';
  let out = '';
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) out += chars[arr[i] % chars.length];
  return out;
}

export async function getPublicQuote(token: string): Promise<PublicQuote | null> {
  const { data, error } = await supabase
    .from('public_quotes')
    .select('*')
    .eq('token', token)
    .maybeSingle();
  if (error) mapError(error, 'getPublicQuote');
  if (!data) return null;
  return mapRow<PublicQuote>(data as Record<string, unknown>);
}

export async function publishQuoteIndexed(
  document: Document,
  biz: PublicQuote['biz'],
): Promise<string> {
  const docId = document.id!;

  const { data: existing } = await supabase
    .from('public_quotes')
    .select('token')
    .eq('document_id', docId)
    .maybeSingle();

  let token: string;
  if (existing) {
    token = existing.token;
  } else {
    token = generateToken();
  }

  const payload = {
    token,
    document_id: docId,
    document,
    biz,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('public_quotes')
    .upsert(payload, { onConflict: 'token' });
  if (error) mapError(error, 'publishQuoteIndexed');

  return token;
}

export async function respondPublicQuote(
  token: string,
  response: 'accepted' | 'rejected',
  clientNote?: string,
  signedBy?: string,
): Promise<void> {
  const { data: snap, error: getErr } = await supabase
    .from('public_quotes')
    .select('*')
    .eq('token', token)
    .maybeSingle();
  if (getErr) mapError(getErr, 'respondPublicQuote');
  if (!snap) throw new Error('Token no encontrado');

  const now = new Date().toISOString();
  const update = {
    status: response,
    client_note: clientNote || '',
    signed_by: signedBy || '',
    signed_at: now,
    updated_at: now,
  };

  const { error: updErr } = await supabase
    .from('public_quotes')
    .update(update)
    .eq('token', token);
  if (updErr) mapError(updErr, 'respondPublicQuote.update');

  // Update original document
  await updateDocument(snap.document_id, {
    status: response === 'accepted' ? 'aceptado' : 'rechazado',
    clientNote: clientNote || '',
    signedBy: signedBy || '',
    signedAt: now,
  } as any);
}

export async function unpublishQuote(docId: string): Promise<void> {
  const { error } = await supabase
    .from('public_quotes')
    .delete()
    .eq('document_id', docId);
  if (error) mapError(error, 'unpublishQuote');
}
