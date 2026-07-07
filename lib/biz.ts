import { supabase } from '@/lib/supabase';
import { mapError, mapRow, toDb } from '@/lib/supabase-helpers';

export interface BizConfig {
  name:     string;
  address:  string;
  phone:    string;
  email:    string;
  cuit:     string;
  currency: string;
  footer:   string;
}

const defaultBiz: BizConfig = {
  name: '', address: '', phone: '', email: '', cuit: '', currency: 'ARS', footer: '',
};

export async function getBizConfig(): Promise<BizConfig> {
  const { data, error } = await supabase
    .from('biz_config')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') mapError(error, 'getBizConfig');
  if (!data) return defaultBiz;
  const mapped = mapRow<BizConfig>(data as Record<string, unknown>);
  return { ...defaultBiz, ...mapped };
}

export async function saveBizConfig(biz: BizConfig): Promise<void> {
  const { error } = await supabase
    .from('biz_config')
    .update(toDb(biz as unknown as Record<string, unknown>, false))
    .eq('id', 1);
  if (error) mapError(error, 'saveBizConfig');
}
