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
  sheetGroups: {
    all: () => ['sheetGroups'] as const,
    detail: (id: string) => ['sheetGroups', id] as const,
  },
  sheets: {
    all: () => ['sheets'] as const,
    detail: (id: string) => ['sheets', id] as const,
  },
  sheetMembers: {
    bySheet: (sheetId: string) => ['sheetMembers', sheetId] as const,
  },
  sheetGroupMembers: {
    byGroup: (groupId: string) => ['sheetGroupMembers', groupId] as const,
    mine: (userId: string) => ['sheetGroupMembers', 'mine', userId] as const,
  },
  sheetRows: {
    bySheet: (sheetId: string) => ['sheetRows', sheetId] as const,
  },
  sheetRowComments: {
    bySheet: (sheetId: string) => ['sheetRowComments', sheetId] as const,
  },
  workstreamMembers: {
    byWorkstream: (wsId: string) => ['workstreamMembers', wsId] as const,
    mine: (userId: string) => ['workstreamMembers', 'mine', userId] as const,
    // Supervisor-aware: includes workstreams accessible to the user OR any of
    // their transitive subordinates. The sorted list is part of the key so
    // changes to the hierarchy invalidate the cache automatically.
    accessible: (userId: string, userIds: readonly string[]) =>
      ['workstreamMembers', 'accessible', userId, userIds] as const,
  },
  auditLogs: {
    list: (filters?: Record<string, unknown>) => ['auditLogs', filters] as const,
  },
  dashboardWidgets: {
    all: () => ['dashboardWidgets'] as const,
  },
  diagrams: {
    all: () => ['diagrams'] as const,
    detail: (id: string) => ['diagrams', id] as const,
  },
  diagramMembers: {
    byDiagram: (diagramId: string) => ['diagramMembers', diagramId] as const,
  },
  diagramGroups: {
    all: () => ['diagramGroups'] as const,
    detail: (id: string) => ['diagramGroups', id] as const,
  },
  diagramGroupMembers: {
    byGroup: (groupId: string) => ['diagramGroupMembers', groupId] as const,
    mine: (userId: string) => ['diagramGroupMembers', 'mine', userId] as const,
  },
};
