import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Upload } from 'lucide-react';
import { resourceSchema } from '@/lib/utils/validation';
import { attachmentsApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { FormField } from '@/components/shared';
import type { Resource, CreateResource } from '@/types';

type ResourceFormValues = CreateResource;

interface ResourceDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ResourceFormValues) => Promise<void>;
  resource?: Resource;
}

export function ResourceDialog({ open, onClose, onSubmit, resource }: ResourceDialogProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ResourceFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(resourceSchema) as any,
    defaultValues: {
      label: '',
      description: null,
      type: 'link',
      url: null,
      file_name: null,
      file_url: null,
      file_size: null,
      created_by: user?.id ?? '',
    },
  });

  const resourceType = watch('type');

  useEffect(() => {
    if (open) {
      if (resource) {
        reset({
          label: resource.label,
          description: resource.description,
          type: resource.type,
          url: resource.url,
          file_name: resource.file_name,
          file_url: resource.file_url,
          file_size: resource.file_size,
          created_by: resource.created_by,
        });
      } else {
        reset({
          label: '',
          description: null,
          type: 'link',
          url: null,
          file_name: null,
          file_url: null,
          file_size: null,
          created_by: user?.id ?? '',
        });
      }
    }
  }, [open, resource, reset, user?.id]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const path = `resources/${Date.now()}_${file.name}`;
      const publicUrl = await attachmentsApi.uploadFile(file, path);
      setValue('file_name', file.name);
      setValue('file_url', publicUrl);
      setValue('file_size', file.size);
    } catch {
      // Upload error handled by caller
    } finally {
      setIsUploading(false);
    }
  };

  const handleFormSubmit = async (data: ResourceFormValues) => {
    await onSubmit(data);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-surface-200 max-w-md w-full p-6">
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded hover:bg-surface-100">
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {resource ? 'Edit Resource' : 'Add Resource'}
        </h3>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <FormField label="Label" required error={errors.label?.message}>
            <input
              {...register('label')}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
            />
          </FormField>

          <FormField label="Description" error={errors.description?.message}>
            <textarea
              {...register('description')}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
            />
          </FormField>

          <FormField label="Type" required>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setValue('type', 'link')}
                className={`flex-1 px-3 py-2 text-sm rounded-xl border ${
                  resourceType === 'link'
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'border-surface-200 text-gray-600 hover:bg-surface-100'
                }`}
              >
                Link
              </button>
              <button
                type="button"
                onClick={() => setValue('type', 'file')}
                className={`flex-1 px-3 py-2 text-sm rounded-xl border ${
                  resourceType === 'file'
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'border-surface-200 text-gray-600 hover:bg-surface-100'
                }`}
              >
                File
              </button>
            </div>
          </FormField>

          {resourceType === 'link' && (
            <FormField label="URL" required error={errors.url?.message}>
              <input
                {...register('url')}
                type="url"
                placeholder="https://"
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
              />
            </FormField>
          )}

          {resourceType === 'file' && (
            <FormField label="File" required>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm border border-dashed border-surface-200 rounded-xl text-gray-500 hover:bg-surface-100 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {isUploading
                  ? 'Uploading...'
                  : watch('file_name')
                    ? watch('file_name')
                    : 'Choose file'}
              </button>
            </FormField>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-surface-200 rounded-xl hover:bg-surface-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : resource ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
