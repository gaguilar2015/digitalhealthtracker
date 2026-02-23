import { supabase } from '../supabase';
import type { Sheet, CreateSheet, UpdateSheet } from '@/types';

export async function getAll(): Promise<Sheet[]> {
  const { data, error } = await supabase
    .from('sheets')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function getById(id: string): Promise<Sheet> {
  const { data, error } = await supabase
    .from('sheets')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function create(sheet: CreateSheet): Promise<Sheet> {
  const { data, error } = await supabase
    .from('sheets')
    .insert(sheet)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function update(id: string, sheet: UpdateSheet): Promise<Sheet> {
  const { data, error } = await supabase
    .from('sheets')
    .update(sheet)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('sheets')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
