import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BookOpen, LayoutDashboard, ClipboardList, GanttChart, FolderOpen, Table2, Workflow,
  Users, UserCog, ChevronDown, ChevronRight,
  Plus, Pencil, Trash2, GripVertical, CheckCircle2, ListChecks,
} from 'lucide-react';
// CircleDot removed — unused
import { clsx } from 'clsx';

// ---------- section definitions ----------

interface TocEntry {
  id: string;
  label: string;
  icon: React.ElementType;
  children?: { id: string; label: string }[];
}

const toc: TocEntry[] = [
  { id: 'getting-started', label: 'Getting Started', icon: BookOpen },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    id: 'workplan', label: 'Workplan', icon: ClipboardList,
    children: [
      { id: 'wp-navigation', label: 'Navigation' },
      { id: 'wp-workstreams', label: 'Workstreams' },
      { id: 'wp-activities', label: 'Activities & Groups' },
      { id: 'wp-tasks', label: 'Tasks' },
      { id: 'wp-deliverables', label: 'Deliverables' },
      { id: 'wp-my-work', label: 'My Work & My Team' },
    ],
  },
  { id: 'timeline', label: 'Timeline', icon: GanttChart },
  { id: 'resources', label: 'Resources', icon: FolderOpen },
  { id: 'sheets', label: 'Sheets', icon: Table2 },
  { id: 'diagrams', label: 'Diagrams', icon: Workflow },
  { id: 'team', label: 'Team Management', icon: Users },
  { id: 'profile', label: 'Profile & Account', icon: UserCog },
];

// all ids (flat) for scroll-spy
const allIds = toc.flatMap(t => [t.id, ...(t.children?.map(c => c.id) ?? [])]);

// ---------- tiny helper components ----------

function StatusDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={clsx('inline-block w-2 h-2 rounded-full', color)} />
      <span>{label}</span>
    </span>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-block px-1.5 py-0.5 text-xs font-mono bg-surface-100 border border-surface-200 rounded text-gray-600">
      {children}
    </kbd>
  );
}

function IconInline({ icon: Icon }: { icon: React.ElementType }) {
  return <Icon className="inline w-4 h-4 text-gray-500 -mt-0.5" />;
}

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-lg font-bold text-gray-900 scroll-mt-24 mb-3">
      {children}
    </h2>
  );
}

function SubHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="text-base font-semibold text-gray-800 scroll-mt-24 mt-6 mb-2">
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-600 leading-relaxed mb-3">{children}</p>;
}

function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1.5 mb-3 ml-1">{children}</ol>;
}

function Li({ children }: { children: React.ReactNode }) {
  return <li className="leading-relaxed">{children}</li>;
}

function Divider() {
  return <hr className="border-surface-200 my-8" />;
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 bg-primary-50 border border-primary-200 rounded-lg px-3 py-2 mb-4 text-sm text-primary-800">
      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

// ---------- main component ----------

export default function GuidePage() {
  const [activeId, setActiveId] = useState(allIds[0]);
  const [tocOpen, setTocOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // scroll-spy via IntersectionObserver
  const setupObserver = useCallback(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    );
    for (const id of allIds) {
      const el = document.getElementById(id);
      if (el) observerRef.current.observe(el);
    }
  }, []);

  useEffect(() => {
    setupObserver();
    return () => observerRef.current?.disconnect();
  }, [setupObserver]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setTocOpen(false);
  };

  // determine which top-level section is active (for expanding children)
  const activeParent = toc.find(
    t => t.id === activeId || t.children?.some(c => c.id === activeId),
  )?.id;

  return (
    <div className="flex h-full">
      {/* Desktop ToC sidebar */}
      <aside className="hidden lg:block w-56 shrink-0 border-r border-surface-200 overflow-y-auto sticky top-0 h-[calc(100vh-3.5rem)] p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contents</p>
        <nav className="space-y-0.5">
          {toc.map(item => (
            <div key={item.id}>
              <button
                onClick={() => scrollTo(item.id)}
                className={clsx(
                  'flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors',
                  activeParent === item.id
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-surface-100',
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </button>
              {item.children && activeParent === item.id && (
                <div className="ml-6 mt-0.5 space-y-0.5 border-l border-surface-200 pl-2">
                  {item.children.map(child => (
                    <button
                      key={child.id}
                      onClick={() => scrollTo(child.id)}
                      className={clsx(
                        'block w-full text-left px-2 py-1 rounded-md text-xs transition-colors',
                        activeId === child.id
                          ? 'text-primary-700 font-medium'
                          : 'text-gray-500 hover:text-gray-800',
                      )}
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>

      {/* Content area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24">
          {/* Header */}
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">User Guide</h1>
              <p className="text-xs text-gray-400">Digital Health Tracker &mdash; BL-L1048</p>
            </div>
          </div>

          {/* Mobile ToC toggle */}
          <div className="lg:hidden mt-4 mb-6">
            <button
              onClick={() => setTocOpen(o => !o)}
              className="flex items-center gap-2 w-full px-3 py-2 border border-surface-200 rounded-lg text-sm text-gray-600 hover:bg-surface-50"
            >
              <ListChecks className="w-4 h-4" />
              <span>Table of Contents</span>
              <ChevronDown className={clsx('w-4 h-4 ml-auto transition-transform', tocOpen && 'rotate-180')} />
            </button>
            {tocOpen && (
              <nav className="mt-1 border border-surface-200 rounded-lg bg-white p-2 space-y-0.5 shadow-sm">
                {toc.map(item => (
                  <div key={item.id}>
                    <button
                      onClick={() => scrollTo(item.id)}
                      className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md text-sm text-gray-600 hover:bg-surface-100"
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </button>
                    {item.children?.map(child => (
                      <button
                        key={child.id}
                        onClick={() => scrollTo(child.id)}
                        className="block w-full text-left pl-8 pr-2 py-1 rounded-md text-xs text-gray-500 hover:text-gray-800"
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                ))}
              </nav>
            )}
          </div>

          {/* ================================================================
              SECTION 1 — Getting Started
          ================================================================ */}
          <SectionHeading id="getting-started">Getting Started</SectionHeading>
          <P>
            The Digital Health Tracker helps you plan, monitor, and report on the
            activities and deliverables for BL-L1048. After logging in with your
            email and password, you land on the <strong>Dashboard</strong>.
          </P>
          <P>
            The left sidebar (desktop) or hamburger menu (mobile) gives you access
            to all sections: Dashboard, Workplan, Timeline, Resources, Sheets, and
            Diagrams.
          </P>

          <SubHeading id="gs-permissions">Permission Levels</SubHeading>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {([
              ['Admin', 'bg-purple-50 border-purple-200 text-purple-800', 'Full access. Create workstreams, manage team members, see everything.'],
              ['Member', 'bg-blue-50 border-blue-200 text-blue-800', 'Create & edit activities, tasks, and deliverables. Edit sheets and diagrams you have access to.'],
              ['Viewer', 'bg-gray-50 border-gray-200 text-gray-700', 'Read-only across the entire application.'],
            ] as const).map(([title, cls, desc]) => (
              <div key={title} className={clsx('border rounded-lg p-3', cls)}>
                <p className="text-sm font-semibold mb-1">{title}</p>
                <p className="text-xs leading-relaxed opacity-80">{desc}</p>
              </div>
            ))}
          </div>

          <Divider />

          {/* ================================================================
              SECTION 2 — Dashboard
          ================================================================ */}
          <SectionHeading id="dashboard">Dashboard</SectionHeading>
          <P>
            The Dashboard gives you a real-time snapshot of project health.
          </P>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mb-3 ml-1">
            <li><strong>Stat cards</strong> &mdash; Total Deliverables, Overall Progress, On Track, and Needs Attention counts.</li>
            <li><strong>Upcoming Deadlines</strong> &mdash; Activities and deliverables due within the next 30 days.</li>
            <li><strong>Needs Attention</strong> &mdash; Overdue or delayed items, sorted by urgency.</li>
            <li><strong>Workstream Progress</strong> &mdash; Horizontal bar chart showing completion per workstream.</li>
            <li><strong>Activity Status Breakdown</strong> &mdash; Donut chart of statuses across all activities.</li>
          </ul>
          <Tip>
            Use the scope toggle (top-right) to switch between <strong>Project</strong>, <strong>My Team</strong>, or <strong>My Work</strong> views.
          </Tip>

          <Divider />

          {/* ================================================================
              SECTION 3 — Workplan (primary)
          ================================================================ */}
          <SectionHeading id="workplan">Workplan</SectionHeading>
          <P>
            The Workplan is the core of the tracker. It organizes all work into a
            three-level hierarchy:
          </P>
          <div className="flex items-center gap-2 text-sm text-gray-700 mb-4 flex-wrap">
            <span className="bg-primary-50 text-primary-700 px-2 py-0.5 rounded font-medium">Workstream</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="bg-surface-100 text-gray-700 px-2 py-0.5 rounded font-medium">Activity Group <span className="text-gray-400 font-normal">(optional)</span></span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="bg-surface-100 text-gray-700 px-2 py-0.5 rounded font-medium">Activity</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="bg-surface-100 text-gray-700 px-2 py-0.5 rounded font-medium">Task</span>
          </div>
          <P>
            <strong>Deliverables</strong> live alongside activities within a
            workstream but have their own tab and lifecycle.
          </P>

          {/* --- 3a Navigation --- */}
          <SubHeading id="wp-navigation">Sidebar Navigation</SubHeading>
          <P>
            The Workplan sidebar lists every workstream grouped by owner. At the
            top you'll find quick-access views:
          </P>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mb-3 ml-1">
            <li><strong>My Work</strong> &mdash; Items assigned to you.</li>
            <li><strong>My Team</strong> &mdash; Items assigned to you or your direct reports (if applicable).</li>
            <li><strong>All Workstreams</strong> &mdash; Project-wide overview with an Activities tab for cross-workstream searching.</li>
          </ul>
          <P>
            Click any workstream to open it. Each workstream has two tabs:
            <strong> Activities</strong> and <strong>Deliverables</strong>.
          </P>
          <Tip>
            Collapse the sidebar with the toggle button at the bottom to gain more screen space. In collapsed mode, workstreams show as color-coded icons with tooltips.
          </Tip>

          {/* --- 3b Workstreams --- */}
          <SubHeading id="wp-workstreams">Workstreams</SubHeading>
          <P>
            Workstreams are the top-level containers. Each has a code, name, color,
            date range, and owner.
          </P>

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-2">Create a Workstream <span className="text-purple-600">(Admin)</span></p>
          <Steps>
            <Li>Click the <IconInline icon={Plus} /> button at the top of the sidebar.</Li>
            <Li>Fill in Code, Short Name, Full Name, Color, dates, and Owner.</Li>
            <Li>Click <strong>Create</strong>.</Li>
          </Steps>

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-2">Edit or Manage Access</p>
          <P>
            Open a workstream and click <IconInline icon={Pencil} /> <strong>Edit</strong> in
            the header to modify details. Click <IconInline icon={Users} /> <strong>Manage
            Access</strong> to add or remove team members who can work in this
            workstream.
          </P>

          {/* --- 3c Activities & Groups --- */}
          <SubHeading id="wp-activities">Activities & Groups</SubHeading>
          <P>
            Activities are units of work inside a workstream. They can optionally be
            organized into <strong>Activity Groups</strong> for logical grouping.
          </P>

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-2">Create an Activity</p>
          <Steps>
            <Li>Navigate to a workstream's <strong>Activities</strong> tab.</Li>
            <Li>Click <strong>Add Activity</strong> (top-right).</Li>
            <Li>Fill in Code, Name, dates, status, assignee, and optional fields.</Li>
            <Li>Click <strong>Create</strong>.</Li>
          </Steps>

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-2">Edit or Delete</p>
          <P>
            Hover over an activity row to reveal <IconInline icon={Pencil} /> Edit
            and <IconInline icon={Trash2} /> Delete buttons on the right.
          </P>

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-2">Activity Groups</p>
          <P>
            Click <strong>Add Group</strong> to create a named group. Activities can
            be dragged into groups. Ungrouped activities appear in their own section.
          </P>

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-2">Reordering</p>
          <P>
            Drag the <IconInline icon={GripVertical} /> handle on any activity or
            group row to reorder. Changes are saved automatically.
          </P>

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-2">Statuses</p>
          <div className="flex flex-wrap gap-3 text-sm mb-4">
            <StatusDot color="bg-gray-400" label="Not Started" />
            <StatusDot color="bg-blue-500" label="In Progress" />
            <StatusDot color="bg-green-500" label="Complete" />
            <StatusDot color="bg-red-500" label="Delayed" />
          </div>
          <P>
            Click the status dropdown on any row to change it instantly (optimistic
            update). Transitions are unrestricted — you can move between any
            statuses.
          </P>

          {/* --- 3d Tasks --- */}
          <SubHeading id="wp-tasks">Tasks</SubHeading>
          <P>
            Tasks are sub-items under an activity. Expand an activity row (click
            the chevron) to see its tasks.
          </P>

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-2">Create a Task</p>
          <Steps>
            <Li>Hover over an activity row and click <strong>Add Task</strong>.</Li>
            <Li>Enter a Name (required), optional Code, dates, status, and assignee.</Li>
            <Li>Click <strong>Create</strong>.</Li>
          </Steps>
          <Tip>
            When all tasks in an activity are marked <strong>Complete</strong>, the
            parent activity is automatically set to Complete as well.
          </Tip>

          {/* --- 3e Deliverables --- */}
          <SubHeading id="wp-deliverables">Deliverables</SubHeading>
          <P>
            Deliverables track milestone outputs. They live on the
            <strong> Deliverables</strong> tab of each workstream.
          </P>

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-2">Create a Deliverable</p>
          <Steps>
            <Li>Switch to the <strong>Deliverables</strong> tab.</Li>
            <Li>Click <strong>Add Deliverable</strong>.</Li>
            <Li>Enter Name, Due Date, optional description, linked activity, and assignee.</Li>
            <Li>Click <strong>Create</strong>.</Li>
          </Steps>
          <Tip>
            When a deliverable's status is changed to <strong>Complete</strong>,
            the completion date is automatically set to today. Changing it away from
            Complete clears the completion date.
          </Tip>

          {/* --- 3f My Work --- */}
          <SubHeading id="wp-my-work">My Work & My Team</SubHeading>
          <P>
            <strong>My Work</strong> shows only activities and deliverables assigned
            to you, organized by workstream. <strong>My Team</strong> extends this
            to include items assigned to your direct reports.
          </P>
          <P>
            These views are accessible from the top of the Workplan sidebar. Only
            workstreams containing relevant items are shown.
          </P>

          <Divider />

          {/* ================================================================
              SECTION 4 — Timeline
          ================================================================ */}
          <SectionHeading id="timeline">Timeline</SectionHeading>
          <P>
            The Timeline page renders an interactive <strong>Gantt chart</strong> of
            all workstreams, activities, and deliverables on a time axis.
          </P>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mb-3 ml-1">
            <li><strong>Zoom</strong> &mdash; Use the zoom slider to change the time scale.</li>
            <li><strong>Detail level</strong> &mdash; Switch between activity-level and task-level detail.</li>
            <li><strong>Filters</strong> &mdash; Filter by workstream or owner using the dropdowns.</li>
            <li><strong>Deliverables</strong> appear as diamond markers on the chart.</li>
          </ul>
          <Tip>
            The Timeline is read-only. To edit dates or statuses, go to the Workplan page.
          </Tip>

          <Divider />

          {/* ================================================================
              SECTION 5 — Resources
          ================================================================ */}
          <SectionHeading id="resources">Resources</SectionHeading>
          <P>
            Resources are project-level shared files and links (distinct from
            item-level attachments).
          </P>
          <Steps>
            <Li>Click <strong>Add Resource</strong>.</Li>
            <Li>Choose type: <strong>File</strong> (upload) or <strong>Link</strong> (URL).</Li>
            <Li>Add a label and optional description.</Li>
            <Li>Click <strong>Create</strong>.</Li>
          </Steps>
          <P>
            Use the search bar to filter resources by name or description. Hover
            a card to see Edit and Delete options.
          </P>

          <Divider />

          {/* ================================================================
              SECTION 6 — Sheets
          ================================================================ */}
          <SectionHeading id="sheets">Sheets</SectionHeading>
          <P>
            Sheets are custom spreadsheet-like tables for tracking anything outside
            the standard workplan hierarchy.
          </P>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mb-3 ml-1">
            <li><strong>Columns</strong> &mdash; Text, Number, Date, Select, Multi-select, Checkbox.</li>
            <li><strong>Row grouping</strong> &mdash; Organize rows into named sections or auto-group by column value.</li>
            <li><strong>Cell formatting</strong> &mdash; Per-column background/text colors and conditional formatting rules.</li>
            <li><strong>Row comments</strong> &mdash; Click a row to open a slide-out comment panel.</li>
            <li><strong>Drag reorder</strong> &mdash; Drag rows to rearrange.</li>
            <li><strong>Import</strong> &mdash; Import data from CSV files.</li>
            <li><strong>Access control</strong> &mdash; Manage who can view or edit each sheet.</li>
          </ul>
          <P>
            Sheets can be organized into <strong>Sheet Groups</strong> for
            bulk-granting access to a collection of related sheets.
          </P>

          <Divider />

          {/* ================================================================
              SECTION 7 — Diagrams
          ================================================================ */}
          <SectionHeading id="diagrams">Diagrams</SectionHeading>
          <P>
            Diagrams let you build interactive data-flow and process diagrams on
            an SVG canvas.
          </P>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mb-3 ml-1">
            <li><strong>12 shape types</strong> &mdash; Systems, processes, databases, forms, decisions, and more.</li>
            <li><strong>Edges</strong> &mdash; Connect nodes with labeled, straight, or bezier arrows.</li>
            <li><strong>Canvas tools</strong> &mdash; Snap-to-grid, minimap, undo/redo, copy/paste.</li>
            <li><strong>Right-click menus</strong> &mdash; Edit, duplicate, change edge type, delete.</li>
            <li><strong>Legend</strong> &mdash; Add a color-coded legend overlay.</li>
            <li><strong>Export</strong> &mdash; Download as PNG or SVG.</li>
          </ul>
          <P>Keyboard shortcuts:</P>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mb-4">
            <span><Kbd>Delete</Kbd> Delete selected</span>
            <span><Kbd>Ctrl+C</Kbd> / <Kbd>V</Kbd> Copy / Paste</span>
            <span><Kbd>Ctrl+Z</Kbd> Undo</span>
            <span><Kbd>Ctrl+Shift+Z</Kbd> Redo</span>
            <span><Kbd>Ctrl+A</Kbd> Select all</span>
            <span><Kbd>Ctrl+D</Kbd> Duplicate</span>
          </div>

          <Divider />

          {/* ================================================================
              SECTION 8 — Team Management
          ================================================================ */}
          <SectionHeading id="team">Team Management</SectionHeading>
          <P>
            Admins can manage team members from <strong>Admin &rarr; Team</strong> in
            the sidebar.
          </P>

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-2">Invite a New Member</p>
          <Steps>
            <Li>Click <strong>Invite Member</strong>.</Li>
            <Li>Enter the member's full name, email, and select a permission level.</Li>
            <Li>Set a default password and share it with the member out-of-band.</Li>
            <Li>Click <strong>Invite</strong>.</Li>
          </Steps>

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-2">Edit Permissions or Deactivate</p>
          <P>
            Click <IconInline icon={Pencil} /> on a team member row to change their
            permission level. Use the <strong>Deactivate</strong> button to revoke
            access (reversible — you can reactivate later).
          </P>

          <Divider />

          {/* ================================================================
              SECTION 9 — Profile
          ================================================================ */}
          <SectionHeading id="profile">Profile & Account</SectionHeading>
          <P>
            Visit <strong>Profile</strong> (sidebar bottom) to update your name,
            title, location, phone, and bio. Your email and permission level are
            shown on the right but cannot be self-edited.
          </P>
          <P>
            Click <strong>Change Password</strong> to update your password. You'll
            need to enter your new password and confirm it.
          </P>
        </div>
      </main>
    </div>
  );
}
