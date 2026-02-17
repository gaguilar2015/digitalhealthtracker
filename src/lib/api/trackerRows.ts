import { supabase } from '../supabase';
import type { TrackerRow, CreateTrackerRow, UpdateTrackerRow } from '@/types';

export async function getByTracker(trackerId: string): Promise<TrackerRow[]> {
  const { data, error } = await supabase
    .from('tracker_rows')
    .select('*')
    .eq('tracker_id', trackerId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function create(row: CreateTrackerRow): Promise<TrackerRow> {
  const { data, error } = await supabase
    .from('tracker_rows')
    .insert(row)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function update(id: string, row: UpdateTrackerRow): Promise<TrackerRow> {
  const { data, error } = await supabase
    .from('tracker_rows')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('tracker_rows')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function bulkCreate(rows: CreateTrackerRow[]): Promise<TrackerRow[]> {
  const BATCH_SIZE = 100;
  const results: TrackerRow[] = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('tracker_rows')
      .insert(batch)
      .select();
    if (error) throw new Error(error.message);
    results.push(...data);
  }
  return results;
}
