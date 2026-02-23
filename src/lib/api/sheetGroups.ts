import { supabase } from '../supabase';
import type { SheetGroup, CreateSheetGroup, UpdateSheetGroup } from '@/types';

export async function getAll(): Promise<SheetGroup[]> {
  const { data, error } = await supabase
    .from('sheet_groups')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function getById(id: string): Promise<SheetGroup> {
  const { data, error } = await supabase
    .from('sheet_groups')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function create(group: CreateSheetGroup): Promise<SheetGroup> {
  const { data, error } = await supabase
    .from('sheet_groups')
    .insert(group)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function update(id: string, group: UpdateSheetGroup): Promise<SheetGroup> {
  const { data, error } = await supabase
    .from('sheet_groups')
    .update(group)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('sheet_groups')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
