import { useCallback, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSheets } from '@/hooks/useSheets';
import { useSheetGroups } from '@/hooks/useSheetGroups';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { SkeletonLoader } from '@/components/shared';
import { SheetSidebar } from './SheetSidebar';
import { SheetsOverview } from './SheetsOverview';
import { SheetDetailContent } from './SheetDetailContent';
import { clsx } from 'clsx';

export default function SheetsPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { sheets, isLoading } = useSheets();
  const { groups } = useSheetGroups();
  const [collapsed, setCollapsed] = useState(false);

  const handleSelectSheet = useCallback(
    (sheetId: string | null) => {
      if (sheetId) {
        navigate(`/sheets/${sheetId}`);
      } else {
        navigate('/sheets');
      }
    },
    [navigate],
  );

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.sort_order - b.sort_order),
    [groups],
  );

  const sortedSheets = useMemo(
    () => [...sheets].sort((a, b) => a.sort_order - b.sort_order),
    [sheets],
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
              onChange={e => handleSelectSheet(e.target.value || null)}
              className="w-full rounded-xl border-surface-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
            >
              <option value="">All Sheets</option>
              {hasGroups ? (
                <>
                  {sortedGroups.map(group => {
                    const groupSheets = sortedSheets.filter(t => t.group_id === group.id);
                    if (groupSheets.length === 0) return null;
                    return (
                      <optgroup key={group.id} label={group.name}>
                        {groupSheets.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                  {sortedSheets.filter(t => !t.group_id).length > 0 && (
                    <optgroup label="Ungrouped">
                      {sortedSheets.filter(t => !t.group_id).map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </>
              ) : (
                sortedSheets.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="p-4">
            {id ? (
              <SheetDetailContent sheetId={id} />
            ) : (
              <SheetsOverview onSelectSheet={handleSelectSheet} />
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
            <SheetSidebar
              selectedId={id ?? null}
              onSelect={handleSelectSheet}
              collapsed={collapsed}
              onToggleCollapse={() => setCollapsed(c => !c)}
            />
          </aside>
          <main className="flex-1 overflow-y-auto p-6 page-enter">
            {id ? (
              <SheetDetailContent sheetId={id} />
            ) : (
              <SheetsOverview onSelectSheet={handleSelectSheet} />
            )}
          </main>
        </>
      )}
    </div>
  );
}
