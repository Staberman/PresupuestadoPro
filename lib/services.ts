import { supabase } from '@/lib/supabase';
import { mapError, mapRows, mapRow, toDb } from '@/lib/supabase-helpers';
import type { UnitCode } from '@/lib/documents';

export interface Service {
  id?:        string;
  name:       string;
  desc:       string;
  unit:       UnitCode;
  price:      number;
  category:   string;
  active:     boolean;
  createdAt?: string;
  updatedAt?: string;
}

export async function getServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) mapError(error, 'getServices');
  return mapRows<Service>(data as Record<string, unknown>[]);
}

export async function createService(data: Service): Promise<string> {
  const { data: row, error } = await supabase
    .from('services')
    .insert(toDb(data as unknown as Record<string, unknown>))
    .select('id')
    .single();
  if (error) mapError(error, 'createService');
  return row!.id;
}

export async function updateService(serviceId: string, data: Partial<Service>): Promise<void> {
  const { error } = await supabase
    .from('services')
    .update(toDb(data as unknown as Record<string, unknown>))
    .eq('id', serviceId);
  if (error) mapError(error, 'updateService');
}

export async function deleteService(serviceId: string): Promise<void> {
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', serviceId);
  if (error) mapError(error, 'deleteService');
}
