import { supabase } from '../supabase';
import type { SheetGroupMember, CreateSheetGroupMember } from '@/types';

export async function getByGroup(groupId: string): Promise<SheetGroupMember[]> {
  const { data, error } = await supabase
    .from('sheet_group_members')
    .select('*')
    .eq('sheet_group_id', groupId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function add(member: CreateSheetGroupMember): Promise<SheetGroupMember> {
  const { data, error } = await supabase
    .from('sheet_group_members')
    .insert(member)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('sheet_group_members')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
