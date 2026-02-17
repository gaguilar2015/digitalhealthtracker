import { supabase } from '../supabase';
import type { TrackerRowComment, CreateTrackerRowComment } from '@/types';

export async function getByTracker(trackerId: string): Promise<TrackerRowComment[]> {
  const { data, error } = await supabase
    .from('tracker_row_comments')
    .select('*')
    .eq('tracker_id', trackerId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function create(comment: CreateTrackerRowComment): Promise<TrackerRowComment> {
  const { data, error } = await supabase
    .from('tracker_row_comments')
    .insert(comment)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('tracker_row_comments')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
