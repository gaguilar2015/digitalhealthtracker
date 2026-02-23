import { supabase } from '../supabase';
import type { SheetMember, CreateSheetMember } from '@/types';

export async function getBySheet(sheetId: string): Promise<SheetMember[]> {
  const { data, error } = await supabase
    .from('sheet_members')
    .select('*')
    .eq('sheet_id', sheetId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function add(member: CreateSheetMember): Promise<SheetMember> {
  const { data, error } = await supabase
    .from('sheet_members')
    .insert(member)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('sheet_members')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
