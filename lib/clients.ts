import { supabase } from '@/lib/supabase';
import { mapError, mapRows, mapRow, toDb } from '@/lib/supabase-helpers';

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
  createdAt?:       string;
  updatedAt?:       string;
}

export async function getClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) mapError(error, 'getClients');
  return mapRows<Client>(data as Record<string, unknown>[]);
}

export async function createClient(data: Client): Promise<string> {
  const { data: row, error } = await supabase
    .from('clients')
    .insert(toDb(data as unknown as Record<string, unknown>))
    .select('id')
    .single();
  if (error) mapError(error, 'createClient');
  return row!.id;
}

export async function updateClient(clientId: string, data: Partial<Client>): Promise<void> {
  const { error } = await supabase
    .from('clients')
    .update(toDb(data as unknown as Record<string, unknown>))
    .eq('id', clientId);
  if (error) mapError(error, 'updateClient');
}

export async function deleteClient(clientId: string): Promise<void> {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', clientId);
  if (error) mapError(error, 'deleteClient');
}
