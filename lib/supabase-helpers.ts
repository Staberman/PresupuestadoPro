import type { PostgrestError } from '@supabase/supabase-js';

export function mapError(err: PostgrestError | null, context: string): never {
  throw new Error(`${context}: ${err?.message || 'unknown error'}`);
}

export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export function toSnakeCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}

export function mapRow<T>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    result[toCamelCase(key)] = row[key];
  }
  return result as T;
}

export function mapRows<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map(r => mapRow<T>(r));
}

export function toDb(
  data: Record<string, unknown>,
  skipId = true,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const skipFields = new Set<string>();
  if (skipId) skipFields.add('id');
  skipFields.add('createdAt');
  skipFields.add('updatedAt');
  for (const key of Object.keys(data)) {
    if (!skipFields.has(key)) {
      const val = data[key];
      if (val !== undefined && val !== null) {
        result[toSnakeCase(key)] = val;
      }
    }
  }
  result.updated_at = new Date().toISOString();
  return result;
}
