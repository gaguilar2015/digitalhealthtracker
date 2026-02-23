import { supabase } from '../supabase';
import type { DashboardWidget, CreateDashboardWidget, UpdateDashboardWidget } from '@/types';

export async function getAll(): Promise<DashboardWidget[]> {
  const { data, error } = await supabase
    .from('dashboard_widgets')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function create(widget: CreateDashboardWidget): Promise<DashboardWidget> {
  const { data, error } = await supabase
    .from('dashboard_widgets')
    .insert(widget)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function update(id: string, widget: UpdateDashboardWidget): Promise<DashboardWidget> {
  const { data, error } = await supabase
    .from('dashboard_widgets')
    .update(widget)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('dashboard_widgets')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
