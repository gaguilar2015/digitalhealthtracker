import { useState, useMemo } from 'react';
import { Plus, FolderOpen } from 'lucide-react';
import { useResources } from '@/hooks/useResources';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/hooks/useAuth';
import { SearchInput, SkeletonLoader, EmptyState, PermissionGate, ConfirmDialog } from '@/components/shared';
import { ResourceCard } from './ResourceCard';
import { ResourceDialog } from './ResourceDialog';
import type { Resource, CreateResource, UpdateResource } from '@/types';

export default function ResourcesPage() {
  const { user, isAdmin } = useAuth();
  const { resources, isLoading, createResource, updateResource, deleteResource } = useResources();
  const { members } = useTeamMembers();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | undefined>();
  const [deletingResource, setDeletingResource] = useState<Resource | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return resources;
    const q = search.toLowerCase();
    return resources.filter(
      r => r.label.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q),
    );
  }, [resources, search]);

  const handleCreate = () => {
    setEditingResource(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource);
    setDialogOpen(true);
  };

  const handleDelete = (resource: Resource) => {
    setDeletingResource(resource);
  };

  const confirmDelete = async () => {
    if (deletingResource) {
      await deleteResource(deletingResource.id);
      setDeletingResource(null);
    }
  };

  const handleSubmit = async (data: CreateResource | UpdateResource) => {
    if (editingResource) {
      await updateResource({ id: editingResource.id, data });
    } else {
      await createResource(data as CreateResource);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Resources</h1>
        <PermissionGate required="member">
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            Add Resource
          </button>
        </PermissionGate>
      </div>

      <div className="mb-6 max-w-sm">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search resources..."
        />
      </div>

      {isLoading ? (
        <SkeletonLoader variant="card" count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="w-12 h-12" />}
          message={search ? 'No resources match your search.' : 'No resources have been added yet.'}
          actionLabel={!search ? 'Add Resource' : undefined}
          onAction={!search ? handleCreate : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(resource => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              teamMembers={members}
              currentUserId={user?.id}
              isAdmin={isAdmin}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <ResourceDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        resource={editingResource}
      />

      <ConfirmDialog
        open={!!deletingResource}
        onClose={() => setDeletingResource(null)}
        onConfirm={confirmDelete}
        title="Delete Resource"
        message={`Are you sure you want to delete "${deletingResource?.label}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
