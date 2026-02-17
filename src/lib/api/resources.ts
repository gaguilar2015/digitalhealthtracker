import { supabase } from '../supabase';
import type { Resource, CreateResource, UpdateResource } from '@/types';

export async function getAll(): Promise<Resource[]> {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function create(resource: CreateResource): Promise<Resource> {
  const { data, error } = await supabase
    .from('resources')
    .insert(resource)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function update(id: string, resource: UpdateResource): Promise<Resource> {
  const { data, error } = await supabase
    .from('resources')
    .update(resource)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('resources')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
