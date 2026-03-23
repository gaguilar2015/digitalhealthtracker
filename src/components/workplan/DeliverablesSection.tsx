import { useState } from 'react';
import { Plus, Package } from 'lucide-react';
import { useDeliverables } from '@/hooks/useDeliverables';
import { useActivities } from '@/hooks/useActivities';
import { usePermissions } from '@/hooks/usePermissions';
import { SkeletonLoader, EmptyState } from '@/components/shared';
import { DeliverableRow } from './DeliverableRow';
import { DeliverableDialog } from './DeliverableDialog';
import type { Workstream } from '@/types';

interface DeliverablesSectionProps {
  workstream: Workstream;
}

export function DeliverablesSection({ workstream }: DeliverablesSectionProps) {
  const [addOpen, setAddOpen] = useState(false);
  const { deliverables, isLoading } = useDeliverables(workstream.id);
  const { activities } = useActivities(workstream.id);
  const { canEditItem } = usePermissions();

  if (isLoading) {
    return <SkeletonLoader variant="table" count={2} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Deliverables</h3>
        {canEditItem && (
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Deliverable
          </button>
        )}
      </div>

      {deliverables.length > 0 ? (
        <div className="border border-surface-200 rounded-lg">
          {deliverables
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(deliverable => (
              <DeliverableRow
                key={deliverable.id}
                deliverable={deliverable}
                workstreamId={workstream.id}
                activities={activities}
              />
            ))}
        </div>
      ) : (
        <EmptyState
          icon={<Package className="w-10 h-10" />}
          message="No deliverables for this workstream yet."
          actionLabel={canEditItem ? 'Add Deliverable' : undefined}
          onAction={canEditItem ? () => setAddOpen(true) : undefined}
        />
      )}

      <DeliverableDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        workstreamId={workstream.id}
      />
    </div>
  );
}
