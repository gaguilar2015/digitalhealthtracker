import { supabase } from '../supabase';
import type { Task, CreateTask, UpdateTask } from '@/types';

export async function getByActivity(actId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('activity_id', actId)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return data;
}

export async function getAll(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('sort_order');
  if (error) throw new Error(error.message);
  return data;
}

export async function create(task: CreateTask): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function update(id: string, task: UpdateTask): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(task)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
