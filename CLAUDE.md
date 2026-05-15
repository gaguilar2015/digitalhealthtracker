# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Mistakes to Avoid

- **Trigger function name:** The updated_at trigger function is `update_updated_at_column()`, NOT `update_updated_at()`. Always use `EXECUTE FUNCTION update_updated_at_column();` in migration files.

## Project Overview

**Digital Health Tracker** (Workplan Tracker v2) is a web application for tracking workplans, deliverables, and timelines for a single healthcare systems improvement project: *BL-L1048: Improving Efficiency, Quality, and Access in Belize's Health System* (Jan 2026 - Dec 2027, 24 months). The full functional specification lives in `FUNCTIONAL_SPEC_V2.md`.

**Current state:** The frontend is fully built and the Supabase backend is deployed. All pages, components, hooks, and API services are implemented. The app is functional with auth, CRUD for all entities, and Tailwind CSS styling.

## Tech Stack

- **Frontend:** React 19 + TypeScript, Vite 7, React Router 7, TanStack React Query 5, Tailwind CSS 4
- **Backend/Database:** Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Forms:** react-hook-form + zod (with `zodResolver() as any` cast for v4 compat)
- **Icons:** lucide-react
- **Toasts:** sonner
- **Date handling:** date-fns
- **Export:** xlsx (Excel), jspdf + html2canvas (Gantt PNG/PDF)
- **Diagrams:** Custom SVG diagram engine (`src/lib/diagram-engine/`), html-to-image (PNG/SVG export)
- **Drag-and-drop:** @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (row reordering in Sheets)
- **Utilities:** clsx, tailwind-merge
- **CSS:** Tailwind v4 — uses `@import "tailwindcss"` + `@theme` + `@plugin` in `src/index.css` (NOT the v3 `@tailwind` directives or `tailwind.config.js`)

## Common Commands

```bash
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # Production build
npx tsc --noEmit     # Type check without emitting
```

## Project Structure

```
src/
├── main.tsx                    # Entry point
├── App.tsx                     # Router, providers, lazy-loaded routes
├── index.css                   # Tailwind v4 config (@import, @theme, @plugin)
├── contexts/AuthContext.tsx     # Auth state provider
├── types/                      # TypeScript types & enums
│   ├── database.ts             # 18 entity interfaces + Create/Update types
│   ├── enums.ts                # Union types + const arrays
│   ├── formatting.ts           # CellStyle, ConditionalFormatRule, SheetRowGroup
│   └── index.ts                # Re-exports
├── lib/
│   ├── supabase.ts             # Supabase client init
│   ├── queryClient.ts          # React Query client (5min stale, retry 1)
│   ├── queryKeys.ts            # Query key factory functions
│   ├── api/                    # Supabase API services (1 file per entity, includes sheets/sheetMembers/sheetRows/sheetGroups/sheetGroupMembers/sheetRowComments/workstreamMembers/diagrams/diagramMembers)
│   └── utils/                  # dates, status, progress, colors, permissions, validation, exportExcel, exportGantt, exportSheet, activityCategories, cellFormatting, sheetIcons, importSheet, reorder, index
├── hooks/                      # 27 custom hooks (CRUD, auth, realtime, dashboard, sheets, groups, reorder, comments, diagrams, etc.)
├── components/
│   ├── auth/                   # LoginPage, ForgotPasswordPage, AuthGuard
│   ├── layout/                 # AppLayout, TopNav, Sidebar, MobileNav
│   ├── shared/                 # 16 reusable UI components
│   ├── workplan/               # WorkplanPage + 16 sub-components & dialogs
│   ├── dashboard/              # DashboardPage + 5 sub-components
│   ├── timeline/               # TimelinePage + 8 Gantt sub-components
│   ├── resources/              # ResourcesPage, ResourceCard, ResourceDialog
│   ├── sheets/                 # SheetsPage (sidebar layout), SheetSidebar, SheetDetailContent, SheetTable, SheetCell, SheetRowComponent, SortableSheetRow, SortableSheetItem, RowCommentPanel, ManageSheetGroupsDialog, ManageGroupAccessDialog, ManageAccessDialog, ManageColumnsDialog, MultiSelectDropdown, ImportSheetDialog, SheetCard, SheetsOverview, dialogs
│   │   ├── formatting/         # FormatToolbar, ColumnFormatPanel, ConditionalFormatDialog, ConditionalRuleRow, FormatColorPicker, SelectOptionBadge, SelectOptionColorsEditor
│   │   └── grouping/           # ManageGroupsDialog
│   ├── diagrams/               # DiagramsPage (sidebar layout), DiagramSidebar, DiagramDetailContent, DiagramToolbar, NodePalette, NodeDetailPopup, NodeEditor, LegendDisplay, LegendEditor, ContextMenu, CreateDiagramDialog, EditDiagramDialog, ManageAccessDialog, DiagramCard, DiagramsOverview
│   ├── profile/                # ProfilePage, ChangePasswordDialog
│   └── admin/                  # TeamPage, TeamTable, InviteMemberDialog, EditMemberDialog
supabase/
├── config.toml                 # Supabase CLI config (linked to remote project)
├── migrations/
│   ├── 20260207000000_initial_schema.sql        # Full schema (enums, tables, triggers, RLS, indexes, realtime, storage)
│   ├── 20260208000000_add_trackers.sql           # Sheets tables (originally named trackers), RLS helpers, triggers, indexes, realtime
│   ├── 20260209000000_add_tracker_sort_order.sql # sort_order column on sheet_rows
│   ├── 20260209000000_add_tracker_icon.sql       # icon column on sheets
│   ├── 20260209000001_add_formatting_and_groups.sql # Cell formatting + row grouping columns
│   ├── 20260209000002_add_auto_group_order.sql   # Auto group ordering support
│   ├── 20260209100000_workstream_access.sql      # workstream_members table + RLS
│   ├── 20260210000000_fix_workstream_access.sql  # Workstream access fixes
│   ├── 20260211000000_add_tracker_groups.sql     # sheet_groups table + RLS
│   ├── 20260215000000_add_tracker_row_comments.sql # sheet_row_comments table + RLS
│   ├── 20260216000000_add_tracker_group_members.sql # sheet_group_members table + RLS
│   ├── 20260218000000_rename_trackers_to_sheets.sql # Rename all tracker tables/functions/indexes to sheet
│   ├── 20260221000000_add_diagrams.sql              # diagrams + diagram_members tables, RLS, triggers, realtime
│   └── 20260221100000_seed_epi_surveillance_diagram.sql # Seed: EPI Surveillance Data Flow diagram
└── functions/
    ├── invite-user/            # Supabase Edge Function: create new team members with default password
    ├── resend-invite/          # Supabase Edge Function: (legacy, replaced by reset-password)
    └── reset-password/         # Supabase Edge Function: admin-set password for existing users
```

## Architecture

### Data Hierarchy (3 levels max)

```
Workstream → Activity Group (optional) → Activity → Task
Workstream → Deliverable (separate from activity hierarchy)
```

All items can have polymorphic **Attachments** (`parent_type` + `parent_id`). **Dependencies** are finish-to-start only and informational (not enforced/blocking). **Resources** are project-level shared files/links, distinct from item-level attachments. **Sheets** are standalone custom spreadsheet-like tables (separate from the workplan hierarchy).

### 18 Core Entities

Workstream, Activity Group, Activity, Task, Deliverable, Dependency, Attachment, Resource, Team Member, Sheet, Sheet Member, Sheet Row, Sheet Group, Sheet Group Member, Workstream Member, Sheet Row Comment, Diagram, Diagram Member. Full field definitions for the original 9 are in `FUNCTIONAL_SPEC_V2.md` Section 3.

### Database

- **Supabase project:** `gwvwcvypfkgobpuoffsz`
- **18 tables** with FK constraints, check constraints, and updated_at triggers
- **6 enums:** item_status, permission_level, workstream_color, dependency_item_type, attachment_parent_type, resource_type
- **RLS** enabled on all tables with policies based on `get_my_permission_level()` helper (SECURITY DEFINER)
- **RLS helpers for sheets:** `is_sheet_member()`, `is_sheet_creator()` (SECURITY DEFINER)
- **RLS helpers for sheet groups:** group membership checks (SECURITY DEFINER)
- **RLS helpers for diagrams:** `is_diagram_member()`, `is_diagram_creator()` (SECURITY DEFINER)
- **Realtime** publication on all tables
- **Storage bucket** `attachments` (private)
- **Deliverable trigger:** auto-sets `completion_date` when status changes to/from `complete`
- **Sheet trigger:** auto-adds creator as member on sheet creation
- **Sheet group trigger:** auto-manages member access when sheets are added to groups
- **Diagram trigger:** auto-adds creator as member on diagram creation

### Routes

| Route | Page | Purpose |
|-------|------|---------|
| `/login` | LoginPage | Email/password auth |
| `/forgot-password` | ForgotPasswordPage | Password reset |
| `/` | Dashboard | Stats, upcoming deadlines, items needing attention |
| `/workplan` | Workplan | Sidebar + content area, full CRUD on work items. "All Workstreams" has Overview/Activities tabs (cross-workstream filterable activity list) |
| `/workplan/:code` | Workplan (deep link) | Pre-selects a workstream |
| `/timeline` | Timeline | Read-only interactive Gantt chart |
| `/resources` | Resources | Shared files and links |
| `/sheets` | Sheets | Collapsible sidebar + "All Sheets" card grid overview |
| `/sheets/:id` | Sheets (deep link) | Pre-selects a sheet, shows spreadsheet table |
| `/diagrams` | Diagrams | Collapsible sidebar + "All Diagrams" card grid overview |
| `/diagrams/:id` | Diagrams (deep link) | Pre-selects a diagram, shows interactive canvas |
| `/profile` | Profile | User settings |
| `/admin/team` | Admin: Team | User management (admin-only) |

### Sheets (custom tables)

Sheets are user-defined spreadsheet-like tables, independent of the workplan hierarchy. Six tables:

- **`sheets`** — definition: name, description, icon, `columns` (JSONB array of `{ id, name, type, options?, formatting? }`), sort_order
- **`sheet_members`** — explicit access control join table (sheet_id + team_member_id, UNIQUE)
- **`sheet_rows`** — data rows with `cells` (JSONB object keyed by column UUID), sort_order, group_id
- **`sheet_groups`** — named groups that bundle multiple sheets for shared access management (name, description, created_by)
- **`sheet_group_members`** — members added to a sheet group (group_id + team_member_id, UNIQUE)
- **`sheet_row_comments`** — comments on individual sheet rows (row_id, author_id, content, timestamps)

Column types: `text`, `number`, `date`, `datetime`, `select`, `multiselect`, `checkbox`. Columns are keyed by UUID (safe to rename). Adding a column leaves existing rows with empty cells; deleting a column leaves orphan keys in JSONB (harmless, not displayed).

**Additional sheet features:**
- **Icons:** Each sheet has an optional icon (from a predefined set in `sheetIcons.ts`)
- **Row reordering:** Rows can be dragged to reorder (via @dnd-kit); sort_order persisted to DB
- **Row groups:** Rows can be manually grouped (named sections) or auto-grouped by a column value; groups managed via ManageGroupsDialog
- **Cell formatting:** Per-column background/text color styles and conditional formatting rules (ConditionalFormatRule); managed via FormatToolbar and ColumnFormatPanel
- **Row comments:** Slide-out RowCommentPanel per row; comments stored in sheet_row_comments
- **Import:** CSV import via ImportSheetDialog (uses importSheet util)

Access model: admin sees all sheets; members/viewers only see sheets they're in `sheet_members` for. Creator + admin can manage settings/columns/access. Members with access can CRUD any row (shared spreadsheet model). Viewers with access are read-only. Creator is auto-added via DB trigger.

**Sheet Groups** provide an additional access layer: members added to a sheet group automatically get access to all sheets within that group. This allows bulk-granting access to a collection of related sheets.

The Sheets page uses a **sidebar layout** (like Workplan): collapsible sidebar listing sheets + spreadsheet content area. Desktop: `w-64`/`w-12` sidebar. Mobile: dropdown select.

### Diagrams (interactive data flow diagrams)

Diagrams are interactive node-edge diagrams built on a custom SVG engine (`src/lib/diagram-engine/`), independent of the workplan hierarchy. Two tables:

- **`diagrams`** — definition: name, description, icon, `flow_data` (JSONB with `{ nodes, edges, viewport }`), `legend` (JSONB array of `{ id, label, color, description? }`), sort_order, created_by
- **`diagram_members`** — access control join table (diagram_id + team_member_id, UNIQUE)

**12 node types:** `system` (rectangle), `process` (rounded rectangle), `database` (cylinder), `form` (parallelogram), `decision` (diamond), `document` (wavy document), `cloud`, `person` (figure), `queue` (horizontal cylinder), `note` (folded note), `terminal` (oval/pill), `group` (dashed container). Each node stores `DiagramNodeData` with label, description, nodeType, optional color/borderColor/details/detailFields.

**3 edge types:** `labeled` (smooth step, default), `straight`, `bezier`. Edges store optional `{ label }` data. Edge type switchable via right-click context menu.

**Canvas features:**
- **Node resize:** All 12 node types support resize handles (visible when selected)
- **Snap-to-grid:** Toggleable, 20px grid aligned with background dots
- **MiniMap:** Toggleable bird's-eye overview (zoomable + pannable)
- **Undo/Redo:** History stack (max 50 entries). Ctrl+Z / Ctrl+Shift+Z
- **Keyboard shortcuts:** Delete/Backspace (delete), Ctrl+C/V (copy/paste), Ctrl+A (select all), Ctrl+D (duplicate)
- **Shape palette:** "Shapes" button in toolbar opens hover dropdown; clicking a shape adds it to the center of the viewport (click-to-add, not drag-to-add)
- **Right-click context menus:** Node menu (Edit, Duplicate, Bring to Front/Back, Delete), Edge menu (edge type submenu, Edit Label, Delete), Pane menu (Paste, Select All, Fit View)
- **Inline edge label editing:** Double-click edge label to edit; shows "Double-click to label" placeholder on selected unlabeled edges
- **Export:** PNG and SVG via `html-to-image`
- **Legend:** Managed via LegendEditor dialog; displayed as overlay; legend colors available as quick-apply in NodeEditor

**Canvas API pattern:** `DiagramCanvasV2` exposes a `DiagramCanvasApi` object via `__diagramApi` on the wrapper div. Methods: `updateNode`, `updateEdge`, `deleteSelected`, `addNode`, `duplicateSelected`, `fitView`, `zoomIn`, `zoomOut`, `undo`, `redo`, `canUndo`, `canRedo`, `getSelectionCount`, `selectAll`, `getFlowData`. Parent accesses it via `canvasWrapperRef.current?.querySelector('[data-diagram-api]')?.__diagramApi`.

Access model: Same pattern as Sheets — admin sees all diagrams; members/viewers only see diagrams they're in `diagram_members` for. Creator + admin can manage settings/access. Viewers are read-only. Creator is auto-added via DB trigger.

The Diagrams page uses a **sidebar layout** (like Sheets): collapsible sidebar listing diagrams + canvas content area. Desktop: `w-64`/`w-12` sidebar. Mobile: dropdown select.

### Permissions (3 levels)

- **Admin:** Full CRUD everywhere; manages team members (invite, edit, delete, reset passwords); audit logs; sees all sheets and diagrams.
- **Member:** Creates and updates workstreams; deletes workstreams they own. Full CRUD on activity groups, activities, tasks, deliverables (edit/delete restricted to own or assigned items). Creates sheets and diagrams; manages sheet groups; CRUDs rows on sheets they have access to; edits diagrams they have access to.
- **Viewer:** Read-only across the app. May post (and delete their own) row-comments on sheets they have access to.

### Workstream access — supervisor inheritance

A user's accessible workstream set is the union of:
1. Workstreams they're a member of via `workstream_members` (auto-added on create via the `workstream_auto_add_owner` trigger), plus
2. The same set computed recursively for every transitive subordinate down the `supervisor_id` chain.

So a supervisor automatically sees the full workplan for everyone they supervise (and their subordinates' subordinates). Sheets and diagrams do NOT follow this rule — those remain on an explicit per-share basis via `sheet_members` / `sheet_group_members` / `diagram_members`. The expansion happens client-side in [useAccessibleWorkstreamIds](src/hooks/useAccessibleWorkstreamIds.ts) and is invalidated by realtime changes to `workstream_members` or `team_members`.

### Key Patterns

- **Path alias:** `@/` maps to `src/` (configured in both vite.config.ts and tsconfig.app.json)
- **verbatimModuleSyntax:** tsconfig requires `import type { ... }` for type-only imports
- **Optimistic updates** for status changes on activities, tasks, deliverables (immediate UI update, rollback on failure via React Query's `onMutate`/`onError`)
- **Supabase Realtime** subscriptions in each entity hook invalidate React Query cache
- **4 statuses:** `not_started`, `in_progress`, `complete`, `delayed` — any-to-any transitions allowed
- **Delayed vs Overdue:** Delayed is a manually-set status; Overdue is system-calculated (past end_date and not complete)
- **Progress:** `(completed / total) * 100` — at project level uses deliverables, at workstream level uses activities
- **Dates:** Calendar dates only (YYYY-MM-DD), displayed as "Jan 15, 2026". No legacy month numbers.
- **Auth:** Supabase Auth, email/password, invite-only (no self-registration), JWT with auto-refresh. New users are created with `admin.createUser({ email, password, email_confirm: true })` — no invite email sent. Admins set a default password and share it out-of-band. Admins can also reset passwords for existing users via `admin.updateUserById()`.
- **Edge Function deployment:** All edge functions must be deployed with `--no-verify-jwt` flag (e.g., `supabase functions deploy reset-password --no-verify-jwt`) because they handle their own auth internally via `getUser()`. Without this flag, Supabase's gateway-level JWT verification rejects requests with 401 before the function code runs.
- **RLS:** PostgreSQL Row Level Security for authorization enforcement
- **Zod + react-hook-form:** Uses `zodResolver() as any` cast due to zod v4 + react-hook-form v7 type incompatibility. Form interfaces are explicit (not z.infer).
- **Tailwind v4:** Custom colors defined in `@theme` block in `src/index.css`, NOT in `tailwind.config.js`. There is no `tailwind.config.js` (deleted — Tailwind v4 does not use it).
- **Hover action buttons:** Row action buttons (edit, delete, etc.) use `opacity-0 group-hover:opacity-100` (NOT `hidden group-hover:flex`) to avoid layout shift on hover.
- **Collapsible sidebar:** The Sheets page has a collapsible sidebar (w-64 expanded, w-12 collapsed) with icon-only mode and tooltips. State managed locally via `useState`.
- **Recharts horizontal bars:** When using `layout="vertical"` (horizontal bar charts), data label `position` must be `'right'` (NOT `'top'` — `'top'` places labels above each bar, overlapping the bar above). Bar `radius` should be `[0, 4, 4, 0]` (round right corners, not top). Right margin should be `40` to prevent label clipping. Use `interval={0}` on YAxis to force all category labels to show. Cap horizontal bar data to ~8 categories max for a `h-64` (256px) container.

### Workstream Color Palette

12 predefined colors (defined in `src/lib/utils/colors.ts` and `src/index.css @theme`): blue `#3B82F6`, indigo `#6366F1`, violet `#8B5CF6`, purple `#A855F7`, pink `#EC4899`, rose `#F43F5E`, orange `#F97316`, amber `#F59E0B`, emerald `#10B981`, teal `#14B8A6`, cyan `#06B6D4`, sky `#0EA5E9`.

Status colors are fixed: gray (not started), blue (in progress), green (complete), red (delayed).

## Design Principles

1. **Simple** — Core pages cover 95% of usage, plus Sheets for ad-hoc custom tables
2. **Pragmatic** — Shallow hierarchy, simple statuses, informational dependencies
3. **Focused** — Workplan tracker + custom Sheets, not a full project management suite. No audit logs, time tracking. Sheets use JSONB for flexible column definitions and support row-level comments; workplan items do not have comments.

## What Is Explicitly Out of Scope

Multi-project support, comments/threads on workplan items (sheet rows do support comments), audit logs, bulk updates, custom fields on workplan items, recurring tasks, time tracking, email notifications, PWA/offline, calendar integrations, Gantt drag-to-edit, dashboard customization, sub-tasks below Task level. See `FUNCTIONAL_SPEC_V2.md` Section 13 for full list with rationale.

## Environment

- `.env.local` contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (public JWT anon key, NOT the secret key)
- Never commit `.env.local` to git
- The Supabase project is linked via `supabase link` (project ref: `gwvwcvypfkgobpuoffsz`)
