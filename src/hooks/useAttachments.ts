import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { attachmentsApi } from '@/lib/api';
import { useAuditLog } from './useAuditLog';
import { toast } from 'sonner';
import type { AttachmentParentType } from '@/types';
import { useAuth } from './useAuth';

export function useAttachments(parentType?: AttachmentParentType, parentId?: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { logEvent } = useAuditLog();

  const query = useQuery({
    queryKey: queryKeys.attachments.byParent(parentType ?? '', parentId ?? ''),
    queryFn: () => attachmentsApi.getByParent(parentType!, parentId!),
    enabled: !!parentType && !!parentId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const path = `${parentType}/${parentId}/${Date.now()}-${file.name}`;
      const fileUrl = await attachmentsApi.uploadFile(file, path);
      return attachmentsApi.create({
        parent_type: parentType!,
        parent_id: parentId!,
        file_name: file.name,
        file_url: fileUrl,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user!.id,
      });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.attachments.byParent(parentType ?? '', parentId ?? '') });
      logEvent({ event_type: 'create', entity_type: 'attachment', entity_id: data.id });
      toast.success('File uploaded');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => attachmentsApi.remove(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.attachments.byParent(parentType ?? '', parentId ?? '') });
      logEvent({ event_type: 'delete', entity_type: 'attachment', entity_id: id });
      toast.success('Attachment deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    attachments: query.data ?? [],
    isLoading: query.isLoading,
    uploadAttachment: uploadMutation.mutateAsync,
    deleteAttachment: deleteMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
  };
}
