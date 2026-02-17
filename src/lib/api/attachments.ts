import { supabase } from '../supabase';
import type { Attachment, CreateAttachment, AttachmentParentType } from '@/types';

export async function getByParent(parentType: AttachmentParentType, parentId: string): Promise<Attachment[]> {
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('parent_type', parentType)
    .eq('parent_id', parentId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function create(attachment: CreateAttachment): Promise<Attachment> {
  const { data, error } = await supabase
    .from('attachments')
    .insert(attachment)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('attachments')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function uploadFile(file: File, path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('attachments')
    .upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);

  const { data: urlData } = supabase.storage
    .from('attachments')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}
