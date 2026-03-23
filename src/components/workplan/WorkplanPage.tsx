import { useCallback, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClipboardList, Package } from 'lucide-react';
import { useWorkstreams } from '@/hooks/useWorkstreams';
import { useActivities } from '@/hooks/useActivities';
import { useDeliverables } from '@/hooks/useDeliverables';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useTeamVisibility } from '@/hooks/useTeamVisibility';
import { SkeletonLoader } from '@/components/shared';
import { WorkplanSidebar } from './WorkplanSidebar';
import { WorkplanAllWorkstreams } from './WorkplanAllWorkstreams';
import { WorkstreamHeader } from './WorkstreamHeader';
import { WorkItemsSection } from './WorkItemsSection';
import { DeliverablesSection } from './DeliverablesSection';
import { clsx } from 'clsx';

type WorkplanTab = 'activities' | 'deliverables';

export default function WorkplanPage() {
  const { code } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { workstreams, isLoading } = useWorkstreams();
  const [activeTab, setActiveTab] = useState<WorkplanTab>('activities');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { setMode: setVisibilityMode } = useTeamVisibility();

  const isSentinel = code === '__my-work__' || code === '__my-team__';
  const selectedWorkstream = (code && !isSentinel)
    ? workstreams.find(ws => ws.code === code) ?? null
    : null;

  // Counts for tab badges
  const { activities } = useActivities(selectedWorkstream?.id);
  const { deliverables } = useDeliverables(selectedWorkstream?.id);

  // Sync visibility mode with URL sentinel codes
  useEffect(() => {
    if (code === '__my-work__') {
      setVisibilityMode('my-work');
    } else if (code === '__my-team__') {
      setVisibilityMode('my-team');
    } else {
      setActiveTab('activities');
      setVisibilityMode('all');
    }
  }, [code, setVisibilityMode]);

  const handleSelectWorkstream = useCallback(
    (wsCode: string | null) => {
      if (wsCode === '__my-work__') {
        setVisibilityMode('my-work');
        navigate('/workplan/__my-work__');
      } else if (wsCode === '__my-team__') {
        setVisibilityMode('my-team');
        navigate('/workplan/__my-team__');
      } else if (wsCode) {
        setVisibilityMode('all');
        navigate(`/workplan/${wsCode}`);
      } else {
        setVisibilityMode('all');
        navigate('/workplan');
      }
    },
    [navigate, setVisibilityMode],
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <SkeletonLoader variant="card" count={4} />
      </div>
    );
  }

  const tabs: { key: WorkplanTab; label: string; icon: typeof ClipboardList; count: number }[] = [
    { key: 'activities', label: 'Activities', icon: ClipboardList, count: activities.length },
    { key: 'deliverables', label: 'Deliverables', icon: Package, count: deliverables.length },
  ];

  const tabBar = selectedWorkstream && (
    <div className="flex gap-1 p-1 bg-surface-100 rounded-xl mb-5">
      {tabs.map(tab => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span
              className={clsx(
                'ml-0.5 min-w-[1.25rem] px-1.5 py-0.5 rounded-full text-xs font-semibold tabular-nums',
                isActive
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-surface-200 text-gray-500',
              )}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );

  const tabContent = selectedWorkstream && (
    activeTab === 'activities'
      ? <WorkItemsSection workstream={selectedWorkstream} />
      : <DeliverablesSection workstream={selectedWorkstream} />
  );

  const renderContent = () => {
    if (selectedWorkstream) {
      return (
        <>
          <WorkstreamHeader workstream={selectedWorkstream} activeTab={activeTab} />
          {tabBar}
          {tabContent}
        </>
      );
    }
    return <WorkplanAllWorkstreams onSelectWorkstream={handleSelectWorkstream} />;
  };

  return (
    <div className="flex h-full">
      {isMobile ? (
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3 border-b border-surface-200 bg-white">
            <select
              value={code ?? ''}
              onChange={e => handleSelectWorkstream(e.target.value || null)}
              className="w-full rounded-xl border-surface-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
            >
              <option value="__my-work__">My Work</option>
              <option value="__my-team__">My Team</option>
              <option value="">All Workstreams</option>
              {workstreams
                .sort((a, b) => a.sort_order - b.sort_order)
                .map(ws => (
                  <option key={ws.id} value={ws.code}>
                    {ws.code} - {ws.short_name}
                  </option>
                ))}
            </select>
          </div>
          <div className="p-4">
            {renderContent()}
          </div>
        </div>
      ) : (
        <>
          <aside className={clsx(
            'flex-shrink-0 border-r border-surface-200 bg-white overflow-y-auto transition-all duration-200',
            sidebarCollapsed ? 'w-12' : 'w-64',
          )}>
            <WorkplanSidebar
              selectedCode={code ?? null}
              onSelect={handleSelectWorkstream}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
            />
          </aside>
          <main className="flex-1 overflow-y-auto p-6 page-enter">
            {renderContent()}
          </main>
        </>
      )}
    </div>
  );
}
