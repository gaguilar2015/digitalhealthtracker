import { useCallback, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTrackers } from '@/hooks/useTrackers';
import { useTrackerGroups } from '@/hooks/useTrackerGroups';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { SkeletonLoader } from '@/components/shared';
import { TrackerSidebar } from './TrackerSidebar';
import { TrackersOverview } from './TrackersOverview';
import { TrackerDetailContent } from './TrackerDetailContent';
import { clsx } from 'clsx';

export default function TrackersPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { trackers, isLoading } = useTrackers();
  const { groups } = useTrackerGroups();
  const [collapsed, setCollapsed] = useState(false);

  const handleSelectTracker = useCallback(
    (trackerId: string | null) => {
      if (trackerId) {
        navigate(`/trackers/${trackerId}`);
      } else {
        navigate('/trackers');
      }
    },
    [navigate],
  );

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.sort_order - b.sort_order),
    [groups],
  );

  const sortedTrackers = useMemo(
    () => [...trackers].sort((a, b) => a.sort_order - b.sort_order),
    [trackers],
  );

  const hasGroups = sortedGroups.length > 0;

  if (isLoading) {
    return (
      <div className="p-6">
        <SkeletonLoader variant="card" count={4} />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {isMobile ? (
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3 border-b border-surface-200 bg-white">
            <select
              value={id ?? ''}
              onChange={e => handleSelectTracker(e.target.value || null)}
              className="w-full rounded-xl border-surface-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
            >
              <option value="">All Trackers</option>
              {hasGroups ? (
                <>
                  {sortedGroups.map(group => {
                    const groupTrackers = sortedTrackers.filter(t => t.group_id === group.id);
                    if (groupTrackers.length === 0) return null;
                    return (
                      <optgroup key={group.id} label={group.name}>
                        {groupTrackers.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                  {sortedTrackers.filter(t => !t.group_id).length > 0 && (
                    <optgroup label="Ungrouped">
                      {sortedTrackers.filter(t => !t.group_id).map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </>
              ) : (
                sortedTrackers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="p-4">
            {id ? (
              <TrackerDetailContent trackerId={id} />
            ) : (
              <TrackersOverview onSelectTracker={handleSelectTracker} />
            )}
          </div>
        </div>
      ) : (
        <>
          <aside
            className={clsx(
              'flex-shrink-0 border-r border-surface-200 bg-white overflow-y-auto transition-all duration-200',
              collapsed ? 'w-12' : 'w-64',
            )}
          >
            <TrackerSidebar
              selectedId={id ?? null}
              onSelect={handleSelectTracker}
              collapsed={collapsed}
              onToggleCollapse={() => setCollapsed(c => !c)}
            />
          </aside>
          <main className="flex-1 overflow-y-auto p-6 page-enter">
            {id ? (
              <TrackerDetailContent trackerId={id} />
            ) : (
              <TrackersOverview onSelectTracker={handleSelectTracker} />
            )}
          </main>
        </>
      )}
    </div>
  );
}
