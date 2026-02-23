import { supabase } from '../supabase';
import type { SheetRowComment, CreateSheetRowComment } from '@/types';

export async function getBySheet(sheetId: string): Promise<SheetRowComment[]> {
  const { data, error } = await supabase
    .from('sheet_row_comments')
    .select('*')
    .eq('sheet_id', sheetId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function create(comment: CreateSheetRowComment): Promise<SheetRowComment> {
  const { data, error } = await supabase
    .from('sheet_row_comments')
    .insert(comment)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('sheet_row_comments')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
