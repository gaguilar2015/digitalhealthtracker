import { useState, useMemo } from 'react';
import { Table2 } from 'lucide-react';
import { useTrackers } from '@/hooks/useTrackers';
import { useTrackerGroups } from '@/hooks/useTrackerGroups';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/hooks/useAuth';
import { SearchInput, EmptyState, ConfirmDialog } from '@/components/shared';
import { TrackerCard } from './TrackerCard';
import type { Tracker, TrackerGroup } from '@/types';

interface TrackersOverviewProps {
  onSelectTracker: (id: string) => void;
}

export function TrackersOverview({ onSelectTracker }: TrackersOverviewProps) {
  const { user, isAdmin } = useAuth();
  const { trackers, deleteTracker } = useTrackers();
  const { groups } = useTrackerGroups();
  const { members } = useTeamMembers();

  const [search, setSearch] = useState('');
  const [deletingTracker, setDeletingTracker] = useState<Tracker | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return trackers;
    const q = search.toLowerCase();
    return trackers.filter(
      t => t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q),
    );
  }, [trackers, search]);

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.sort_order - b.sort_order),
    [groups],
  );

  const hasGroups = sortedGroups.length > 0;

  // Build grouped sections for display
  const groupedSections = useMemo(() => {
    if (!hasGroups) return null;

    const sections: { group: TrackerGroup | null; trackers: Tracker[] }[] = [];

    for (const group of sortedGroups) {
      const groupTrackers = filtered.filter(t => t.group_id === group.id);
      if (groupTrackers.length > 0) {
        sections.push({ group, trackers: groupTrackers });
      }
    }

    const ungrouped = filtered.filter(t => !t.group_id);
    if (ungrouped.length > 0) {
      sections.push({ group: null, trackers: ungrouped });
    }

    return sections;
  }, [hasGroups, sortedGroups, filtered]);

  const confirmDelete = async () => {
    if (deletingTracker) {
      await deleteTracker(deletingTracker.id);
      setDeletingTracker(null);
    }
  };

  const renderTrackerGrid = (items: Tracker[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map(tracker => (
        <TrackerCard
          key={tracker.id}
          tracker={tracker}
          teamMembers={members}
          currentUserId={user?.id}
          isAdmin={isAdmin}
          onEdit={() => onSelectTracker(tracker.id)}
          onDelete={setDeletingTracker}
        />
      ))}
    </div>
  );

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">All Trackers</h1>

      <div className="mb-6 max-w-sm">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search trackers..."
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Table2 className="w-12 h-12" />}
          message={search ? 'No trackers match your search.' : 'No trackers yet. Use the + button in the sidebar to create one.'}
        />
      ) : groupedSections ? (
        <div className="space-y-8">
          {groupedSections.map(section => (
            <div key={section.group?.id ?? 'ungrouped'}>
              <div className="flex items-center gap-2 mb-3">
                {section.group ? (
                  <>
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: section.group.color ?? '#6B7280' }}
                    />
                    <h2 className="text-lg font-semibold text-gray-800">
                      {section.group.name}
                    </h2>
                    <span className="text-sm text-gray-400">
                      ({section.trackers.length})
                    </span>
                  </>
                ) : (
                  <>
                    <h2 className="text-lg font-semibold text-gray-500">
                      Ungrouped
                    </h2>
                    <span className="text-sm text-gray-400">
                      ({section.trackers.length})
                    </span>
                  </>
                )}
              </div>
              {renderTrackerGrid(section.trackers)}
            </div>
          ))}
        </div>
      ) : (
        renderTrackerGrid(filtered)
      )}

      <ConfirmDialog
        open={!!deletingTracker}
        onClose={() => setDeletingTracker(null)}
        onConfirm={confirmDelete}
        title="Delete Tracker"
        message={`Are you sure you want to delete "${deletingTracker?.name}"? All rows and data will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
      />
    </>
  );
}
