# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- **Drag-and-drop:** @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (row reordering in Trackers)
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
│   ├── database.ts             # 16 entity interfaces + Create/Update types
│   ├── enums.ts                # Union types + const arrays
│   ├── formatting.ts           # CellStyle, ConditionalFormatRule, TrackerRowGroup
│   └── index.ts                # Re-exports
├── lib/
│   ├── supabase.ts             # Supabase client init
│   ├── queryClient.ts          # React Query client (5min stale, retry 1)
│   ├── queryKeys.ts            # Query key factory functions
│   ├── api/                    # Supabase API services (1 file per entity, includes trackers/trackerMembers/trackerRows/trackerGroups/trackerGroupMembers/trackerRowComments/workstreamMembers)
│   └── utils/                  # dates, status, progress, colors, permissions, validation, exportExcel, exportGantt, exportTracker, activityCategories, cellFormatting, trackerIcons, importTracker, reorder, index
├── hooks/                      # 24 custom hooks (CRUD, auth, realtime, dashboard, trackers, groups, reorder, comments, etc.)
├── components/
│   ├── auth/                   # LoginPage, ForgotPasswordPage, AuthGuard
│   ├── layout/                 # AppLayout, TopNav, Sidebar, MobileNav
│   ├── shared/                 # 16 reusable UI components
│   ├── workplan/               # WorkplanPage + 16 sub-components & dialogs
│   ├── dashboard/              # DashboardPage + 5 sub-components
│   ├── timeline/               # TimelinePage + 8 Gantt sub-components
│   ├── resources/              # ResourcesPage, ResourceCard, ResourceDialog
│   ├── trackers/               # TrackersPage (sidebar layout), TrackerSidebar, TrackerDetailContent, TrackerTable, TrackerCell, TrackerRowComponent, SortableTrackerRow, SortableTrackerItem, RowCommentPanel, ManageTrackerGroupsDialog, ManageGroupAccessDialog, ManageAccessDialog, ManageColumnsDialog, MultiSelectDropdown, ImportTrackerDialog, TrackerCard, TrackersOverview, dialogs
│   │   ├── formatting/         # FormatToolbar, ColumnFormatPanel, ConditionalFormatDialog, ConditionalRuleRow, FormatColorPicker, SelectOptionBadge, SelectOptionColorsEditor
│   │   └── grouping/           # ManageGroupsDialog
│   ├── profile/                # ProfilePage, ChangePasswordDialog
│   └── admin/                  # TeamPage, TeamTable, InviteMemberDialog, EditMemberDialog
supabase/
├── config.toml                 # Supabase CLI config (linked to remote project)
├── migrations/
│   ├── 20260207000000_initial_schema.sql        # Full schema (enums, tables, triggers, RLS, indexes, realtime, storage)
│   ├── 20260208000000_add_trackers.sql           # Trackers tables, RLS helpers, triggers, indexes, realtime
│   ├── 20260209000000_add_tracker_sort_order.sql # sort_order column on tracker_rows
│   ├── 20260209000000_add_tracker_icon.sql       # icon column on trackers
│   ├── 20260209000001_add_formatting_and_groups.sql # Cell formatting + row grouping columns
│   ├── 20260209000002_add_auto_group_order.sql   # Auto group ordering support
│   ├── 20260209100000_workstream_access.sql      # workstream_members table + RLS
│   ├── 20260210000000_fix_workstream_access.sql  # Workstream access fixes
│   ├── 20260211000000_add_tracker_groups.sql     # tracker_groups table + RLS
│   ├── 20260215000000_add_tracker_row_comments.sql # tracker_row_comments table + RLS
│   └── 20260216000000_add_tracker_group_members.sql # tracker_group_members table + RLS
└── functions/
    ├── invite-user/            # Supabase Edge Function: invite new team members
    └── resend-invite/          # Supabase Edge Function: resend invite emails
```

## Architecture

### Data Hierarchy (3 levels max)

```
Workstream → Activity Group (optional) → Activity → Task
Workstream → Deliverable (separate from activity hierarchy)
```

All items can have polymorphic **Attachments** (`parent_type` + `parent_id`). **Dependencies** are finish-to-start only and informational (not enforced/blocking). **Resources** are project-level shared files/links, distinct from item-level attachments. **Trackers** are standalone custom spreadsheet-like tables (separate from the workplan hierarchy).

### 16 Core Entities

Workstream, Activity Group, Activity, Task, Deliverable, Dependency, Attachment, Resource, Team Member, Tracker, Tracker Member, Tracker Row, Tracker Group, Tracker Group Member, Workstream Member, Tracker Row Comment. Full field definitions for the original 9 are in `FUNCTIONAL_SPEC_V2.md` Section 3.

### Database

- **Supabase project:** `gwvwcvypfkgobpuoffsz`
- **16 tables** with FK constraints, check constraints, and updated_at triggers
- **6 enums:** item_status, permission_level, workstream_color, dependency_item_type, attachment_parent_type, resource_type
- **RLS** enabled on all tables with policies based on `get_my_permission_level()` helper (SECURITY DEFINER)
- **RLS helpers for trackers:** `is_tracker_member()`, `is_tracker_creator()` (SECURITY DEFINER)
- **RLS helpers for tracker groups:** group membership checks (SECURITY DEFINER)
- **Realtime** publication on all tables
- **Storage bucket** `attachments` (private)
- **Deliverable trigger:** auto-sets `completion_date` when status changes to/from `complete`
- **Tracker trigger:** auto-adds creator as member on tracker creation
- **Tracker group trigger:** auto-manages member access when trackers are added to groups

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
| `/trackers` | Trackers | Collapsible sidebar + "All Trackers" card grid overview |
| `/trackers/:id` | Trackers (deep link) | Pre-selects a tracker, shows spreadsheet table |
| `/profile` | Profile | User settings |
| `/admin/team` | Admin: Team | User management (admin-only) |

### Trackers (custom tables)

Trackers are user-defined spreadsheet-like tables, independent of the workplan hierarchy. Five tables:

- **`trackers`** — definition: name, description, icon, `columns` (JSONB array of `{ id, name, type, options?, formatting? }`), sort_order
- **`tracker_members`** — explicit access control join table (tracker_id + team_member_id, UNIQUE)
- **`tracker_rows`** — data rows with `cells` (JSONB object keyed by column UUID), sort_order, group_id
- **`tracker_groups`** — named groups that bundle multiple trackers for shared access management (name, description, created_by)
- **`tracker_group_members`** — members added to a tracker group (group_id + team_member_id, UNIQUE)
- **`tracker_row_comments`** — comments on individual tracker rows (row_id, author_id, content, timestamps)

Column types: `text`, `number`, `date`, `datetime`, `select`, `multiselect`, `checkbox`. Columns are keyed by UUID (safe to rename). Adding a column leaves existing rows with empty cells; deleting a column leaves orphan keys in JSONB (harmless, not displayed).

**Additional tracker features:**
- **Icons:** Each tracker has an optional icon (from a predefined set in `trackerIcons.ts`)
- **Row reordering:** Rows can be dragged to reorder (via @dnd-kit); sort_order persisted to DB
- **Row groups:** Rows can be manually grouped (named sections) or auto-grouped by a column value; groups managed via ManageGroupsDialog
- **Cell formatting:** Per-column background/text color styles and conditional formatting rules (ConditionalFormatRule); managed via FormatToolbar and ColumnFormatPanel
- **Row comments:** Slide-out RowCommentPanel per row; comments stored in tracker_row_comments
- **Import:** CSV import via ImportTrackerDialog (uses importTracker util)

Access model: admin sees all trackers; members/viewers only see trackers they're in `tracker_members` for. Creator + admin can manage settings/columns/access. Members with access can CRUD any row (shared spreadsheet model). Viewers with access are read-only. Creator is auto-added via DB trigger.

**Tracker Groups** provide an additional access layer: members added to a tracker group automatically get access to all trackers within that group. This allows bulk-granting access to a collection of related trackers.

The Trackers page uses a **sidebar layout** (like Workplan): collapsible sidebar listing trackers + spreadsheet content area. Desktop: `w-64`/`w-12` sidebar. Mobile: dropdown select.

### Permissions (3 levels)

- **Admin:** Full CRUD everywhere, manage team members, create workstreams, sees all trackers
- **Member:** View all, create activities/tasks/deliverables, edit/delete own or assigned items, create trackers, CRUD rows on trackers they have access to
- **Viewer:** Read-only everywhere (including trackers they have access to)

### Key Patterns

- **Path alias:** `@/` maps to `src/` (configured in both vite.config.ts and tsconfig.app.json)
- **verbatimModuleSyntax:** tsconfig requires `import type { ... }` for type-only imports
- **Optimistic updates** for status changes on activities, tasks, deliverables (immediate UI update, rollback on failure via React Query's `onMutate`/`onError`)
- **Supabase Realtime** subscriptions in each entity hook invalidate React Query cache
- **4 statuses:** `not_started`, `in_progress`, `complete`, `delayed` — any-to-any transitions allowed
- **Delayed vs Overdue:** Delayed is a manually-set status; Overdue is system-calculated (past end_date and not complete)
- **Progress:** `(completed / total) * 100` — at project level uses deliverables, at workstream level uses activities
- **Dates:** Calendar dates only (YYYY-MM-DD), displayed as "Jan 15, 2026". No legacy month numbers.
- **Auth:** Supabase Auth, email/password, invite-only (no self-registration), JWT with auto-refresh
- **RLS:** PostgreSQL Row Level Security for authorization enforcement
- **Zod + react-hook-form:** Uses `zodResolver() as any` cast due to zod v4 + react-hook-form v7 type incompatibility. Form interfaces are explicit (not z.infer).
- **Tailwind v4:** Custom colors defined in `@theme` block in `src/index.css`, NOT in `tailwind.config.js`. There is no `tailwind.config.js` (deleted — Tailwind v4 does not use it).
- **Hover action buttons:** Row action buttons (edit, delete, etc.) use `opacity-0 group-hover:opacity-100` (NOT `hidden group-hover:flex`) to avoid layout shift on hover.
- **Collapsible sidebar:** The Trackers page has a collapsible sidebar (w-64 expanded, w-12 collapsed) with icon-only mode and tooltips. State managed locally via `useState`.

### Workstream Color Palette

12 predefined colors (defined in `src/lib/utils/colors.ts` and `src/index.css @theme`): blue `#3B82F6`, indigo `#6366F1`, violet `#8B5CF6`, purple `#A855F7`, pink `#EC4899`, rose `#F43F5E`, orange `#F97316`, amber `#F59E0B`, emerald `#10B981`, teal `#14B8A6`, cyan `#06B6D4`, sky `#0EA5E9`.

Status colors are fixed: gray (not started), blue (in progress), green (complete), red (delayed).

## Design Principles

1. **Simple** — Core pages cover 95% of usage, plus Trackers for ad-hoc custom tables
2. **Pragmatic** — Shallow hierarchy, simple statuses, informational dependencies
3. **Focused** — Workplan tracker + custom Trackers, not a full project management suite. No audit logs, time tracking. Trackers use JSONB for flexible column definitions and support row-level comments; workplan items do not have comments.

## What Is Explicitly Out of Scope

Multi-project support, comments/threads on workplan items (tracker rows do support comments), audit logs, bulk updates, custom fields on workplan items, recurring tasks, time tracking, email notifications, PWA/offline, calendar integrations, Gantt drag-to-edit, dashboard customization, sub-tasks below Task level. See `FUNCTIONAL_SPEC_V2.md` Section 13 for full list with rationale.

## Environment

- `.env.local` contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (public JWT anon key, NOT the secret key)
- Never commit `.env.local` to git
- The Supabase project is linked via `supabase link` (project ref: `gwvwcvypfkgobpuoffsz`)
