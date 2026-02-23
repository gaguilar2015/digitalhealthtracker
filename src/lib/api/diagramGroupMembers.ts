import { supabase } from '../supabase';
import type { DiagramGroupMember, CreateDiagramGroupMember } from '@/types';

export async function getByGroup(groupId: string): Promise<DiagramGroupMember[]> {
  const { data, error } = await supabase
    .from('diagram_group_members')
    .select('*')
    .eq('diagram_group_id', groupId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function add(member: CreateDiagramGroupMember): Promise<DiagramGroupMember> {
  const { data, error } = await supabase
    .from('diagram_group_members')
    .insert(member)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('diagram_group_members')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
