export const queryKeys = {
  workstreams: {
    all: () => ['workstreams'] as const,
    detail: (id: string) => ['workstreams', id] as const,
    byCode: (code: string) => ['workstreams', 'code', code] as const,
  },
  activityGroups: {
    all: () => ['activityGroups'] as const,
    byWorkstream: (wsId: string) => ['activityGroups', 'workstream', wsId] as const,
  },
  activities: {
    all: () => ['activities'] as const,
    byWorkstream: (wsId: string) => ['activities', 'workstream', wsId] as const,
    byActivityGroup: (agId: string) => ['activities', 'activityGroup', agId] as const,
    detail: (id: string) => ['activities', id] as const,
  },
  tasks: {
    all: () => ['tasks'] as const,
    byActivity: (actId: string) => ['tasks', 'activity', actId] as const,
    detail: (id: string) => ['tasks', id] as const,
  },
  deliverables: {
    all: () => ['deliverables'] as const,
    byWorkstream: (wsId: string) => ['deliverables', 'workstream', wsId] as const,
    detail: (id: string) => ['deliverables', id] as const,
  },
  dependencies: {
    all: () => ['dependencies'] as const,
    byItem: (type: string, id: string) => ['dependencies', type, id] as const,
  },
  attachments: {
    byParent: (parentType: string, parentId: string) => ['attachments', parentType, parentId] as const,
  },
  resources: {
    all: () => ['resources'] as const,
  },
  teamMembers: {
    all: () => ['teamMembers'] as const,
    current: () => ['teamMembers', 'current'] as const,
    detail: (id: string) => ['teamMembers', id] as const,
  },
  dashboard: {
    all: () => ['dashboard'] as const,
  },
  trackerGroups: {
    all: () => ['trackerGroups'] as const,
    detail: (id: string) => ['trackerGroups', id] as const,
  },
  trackers: {
    all: () => ['trackers'] as const,
    detail: (id: string) => ['trackers', id] as const,
  },
  trackerMembers: {
    byTracker: (trackerId: string) => ['trackerMembers', trackerId] as const,
  },
  trackerGroupMembers: {
    byGroup: (groupId: string) => ['trackerGroupMembers', groupId] as const,
  },
  trackerRows: {
    byTracker: (trackerId: string) => ['trackerRows', trackerId] as const,
  },
  trackerRowComments: {
    byTracker: (trackerId: string) => ['trackerRowComments', trackerId] as const,
  },
  workstreamMembers: {
    byWorkstream: (wsId: string) => ['workstreamMembers', wsId] as const,
    mine: (userId: string) => ['workstreamMembers', 'mine', userId] as const,
  },
  auditLogs: {
    list: (filters?: Record<string, unknown>) => ['auditLogs', filters] as const,
  },
};
