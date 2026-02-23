import { supabase } from '../supabase';
import type { SheetRow, CreateSheetRow, UpdateSheetRow } from '@/types';

export async function getBySheet(sheetId: string): Promise<SheetRow[]> {
  const { data, error } = await supabase
    .from('sheet_rows')
    .select('*')
    .eq('sheet_id', sheetId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function create(row: CreateSheetRow): Promise<SheetRow> {
  const { data, error } = await supabase
    .from('sheet_rows')
    .insert(row)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function update(id: string, row: UpdateSheetRow): Promise<SheetRow> {
  const { data, error } = await supabase
    .from('sheet_rows')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('sheet_rows')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function bulkCreate(rows: CreateSheetRow[]): Promise<SheetRow[]> {
  const BATCH_SIZE = 100;
  const results: SheetRow[] = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('sheet_rows')
      .insert(batch)
      .select();
    if (error) throw new Error(error.message);
    results.push(...data);
  }
  return results;
}
