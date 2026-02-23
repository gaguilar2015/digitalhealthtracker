import { supabase } from '../supabase';
import type { DiagramMember, CreateDiagramMember } from '@/types';

export async function getByDiagram(diagramId: string): Promise<DiagramMember[]> {
  const { data, error } = await supabase
    .from('diagram_members')
    .select('*')
    .eq('diagram_id', diagramId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function add(member: CreateDiagramMember): Promise<DiagramMember> {
  const { data, error } = await supabase
    .from('diagram_members')
    .insert(member)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('diagram_members')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
