import { useState, useMemo } from 'react';
import { Workflow } from 'lucide-react';
import { useDiagrams } from '@/hooks/useDiagrams';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/hooks/useAuth';
import { SearchInput, EmptyState, ConfirmDialog } from '@/components/shared';
import { DiagramCard } from './DiagramCard';
import type { Diagram } from '@/types';

interface DiagramsOverviewProps {
  onSelectDiagram: (id: string) => void;
}

export function DiagramsOverview({ onSelectDiagram }: DiagramsOverviewProps) {
  const { user, isAdmin } = useAuth();
  const { diagrams, deleteDiagram } = useDiagrams();
  const { members } = useTeamMembers();

  const [search, setSearch] = useState('');
  const [deletingDiagram, setDeletingDiagram] = useState<Diagram | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return diagrams;
    const q = search.toLowerCase();
    return diagrams.filter(
      d => d.name.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q),
    );
  }, [diagrams, search]);

  const confirmDelete = async () => {
    if (deletingDiagram) {
      await deleteDiagram(deletingDiagram.id);
      setDeletingDiagram(null);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">All Diagrams</h1>

      <div className="mb-6 max-w-sm">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search diagrams..."
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Workflow className="w-12 h-12" />}
          message={search ? 'No diagrams match your search.' : 'No diagrams yet. Use the + button in the sidebar to create one.'}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(diagram => (
            <DiagramCard
              key={diagram.id}
              diagram={diagram}
              teamMembers={members}
              currentUserId={user?.id}
              isAdmin={isAdmin}
              onEdit={() => onSelectDiagram(diagram.id)}
              onDelete={setDeletingDiagram}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deletingDiagram}
        onClose={() => setDeletingDiagram(null)}
        onConfirm={confirmDelete}
        title="Delete Diagram"
        message={`Are you sure you want to delete "${deletingDiagram?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
      />
    </>
  );
}
