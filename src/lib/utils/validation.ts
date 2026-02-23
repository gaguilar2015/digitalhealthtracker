import { z } from 'zod';

export const workstreamSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  short_name: z.string().min(1, 'Short name is required'),
  description: z.string().nullable().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  color: z.string().min(1, 'Color is required'),
  owner_id: z.string().nullable().optional(),
  sort_order: z.number().int(),
}).refine(d => !d.start_date || !d.end_date || d.end_date >= d.start_date, {
  message: 'End date must be on or after start date',
  path: ['end_date'],
});

export const activityGroupSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  workstream_id: z.string().min(1),
  sort_order: z.number().int(),
});

export const activitySchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  output: z.string().nullable().optional(),
  workstream_id: z.string().min(1),
  activity_group_id: z.string().nullable().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  status: z.enum(['not_started', 'in_progress', 'complete', 'delayed']),
  assigned_to: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  sort_order: z.number().int(),
}).refine(d => !d.start_date || !d.end_date || d.end_date >= d.start_date, {
  message: 'End date must be on or after start date',
  path: ['end_date'],
});

export const taskSchema = z.object({
  code: z.string().nullable().optional(),
  name: z.string().min(1, 'Name is required'),
  activity_id: z.string().min(1),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  status: z.enum(['not_started', 'in_progress', 'complete', 'delayed']),
  assigned_to: z.string().nullable().optional(),
  sort_order: z.number().int(),
});

export const deliverableSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullable().optional(),
  workstream_id: z.string().min(1),
  due_date: z.string().min(1, 'Due date is required'),
  status: z.enum(['not_started', 'in_progress', 'complete', 'delayed']),
  assigned_to: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  sort_order: z.number().int(),
});

export const resourceSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  description: z.string().nullable().optional(),
  type: z.enum(['link', 'file']),
  url: z.string().nullable().optional(),
  file_name: z.string().nullable().optional(),
  file_url: z.string().nullable().optional(),
  file_size: z.number().nullable().optional(),
  created_by: z.string().min(1),
});

export const profileSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(100),
  title: z.string().max(100).nullable().optional(),
  location: z.string().max(100).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z.string().min(1, 'Name is required'),
  title: z.string().nullable().optional(),
  permission_level: z.enum(['admin', 'member', 'viewer']),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const sheetColumnSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Column name is required'),
  type: z.enum(['text', 'number', 'date', 'datetime', 'select', 'multiselect', 'checkbox']),
  options: z.array(z.string()).optional(),
  width: z.number().min(60).optional(),
});

export const sheetSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullable().optional(),
  columns: z.array(sheetColumnSchema).min(1, 'At least one column is required'),
});

export const diagramSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullable().optional(),
});
