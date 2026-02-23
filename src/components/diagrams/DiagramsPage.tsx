import { useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDiagrams } from '@/hooks/useDiagrams';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { SkeletonLoader } from '@/components/shared';
import { DiagramSidebar } from './DiagramSidebar';
import { DiagramsOverview } from './DiagramsOverview';
import { DiagramDetailContent } from './DiagramDetailContent';
import { clsx } from 'clsx';

export default function DiagramsPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { diagrams, isLoading } = useDiagrams();
  const [collapsed, setCollapsed] = useState(false);

  const handleSelectDiagram = useCallback(
    (diagramId: string | null) => {
      if (diagramId) {
        navigate(`/diagrams/${diagramId}`);
      } else {
        navigate('/diagrams');
      }
    },
    [navigate],
  );

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
              onChange={e => handleSelectDiagram(e.target.value || null)}
              className="w-full rounded-xl border-surface-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
            >
              <option value="">All Diagrams</option>
              {diagrams.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="p-4">
            {id ? (
              <DiagramDetailContent diagramId={id} />
            ) : (
              <DiagramsOverview onSelectDiagram={handleSelectDiagram} />
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
            <DiagramSidebar
              selectedId={id ?? null}
              onSelect={handleSelectDiagram}
              collapsed={collapsed}
              onToggleCollapse={() => setCollapsed(c => !c)}
            />
          </aside>
          <main className="flex-1 overflow-y-auto p-6 page-enter">
            {id ? (
              <DiagramDetailContent diagramId={id} />
            ) : (
              <DiagramsOverview onSelectDiagram={handleSelectDiagram} />
            )}
          </main>
        </>
      )}
    </div>
  );
}
