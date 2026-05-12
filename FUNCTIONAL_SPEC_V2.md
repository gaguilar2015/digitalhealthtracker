# Functional Specification: Workplan Tracker v2

> **Version:** 2.0
> **Last Updated:** February 2026
> **Status:** Draft
> **Replaces:** FUNCTIONAL_SPEC.md (v1)

---

## 1. Product Overview

### What It Is

A web application for tracking workplans, deliverables, and timelines for a single project: **BL-L1048: Improving Efficiency, Quality, and Access in Belize's Health System**. It is a daily-driver tool for a small team (3-8 people) to see what work is happening, who is doing it, what's due, and what's behind.

### Who It's For

The Infostructure Lead, Data Analyst, and a small group of collaborators and stakeholders who need visibility into the 24-month project (January 2026 - December 2027).

### Design Principles

1. **Simple.** Three pages cover 95% of usage. No feature exists without a clear daily use case.
2. **Pragmatic.** The hierarchy is 3 levels deep, not 5. Statuses are 4 options, not 12. Dependencies are informational, not enforced. The tool adapts to reality — it does not try to enforce a process.
3. **Focused.** This is a workplan tracker, not a project management suite. No comments, no audit logs, no time tracking, no custom fields. Those belong in bigger tools.

---

## 2. Information Architecture

### Primary Pages

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/` | At-a-glance project health: stats, upcoming deadlines, items needing attention |
| Workplan | `/workplan` | All work items organized by workstream, with full CRUD |
| Timeline | `/timeline` | Read-only interactive Gantt chart |

### Supporting Pages

| Page | Route | Purpose |
|------|-------|---------|
| Resources | `/resources` | Shared files, links, and reference materials |
| Profile | `/profile` | Personal settings and account info |
| Admin: Team | `/admin/team` | User management (admin-only) |

### Deep Links

- `/workplan/:code` — Opens the Workplan page with the specified workstream selected in the sidebar (e.g., `/workplan/WS1`). If the code doesn't match a workstream, the page loads with no workstream selected and shows a "Workstream not found" message.

### URL Query Parameters

- `/workplan?status=delayed` — Pre-filters the workplan view by status.
- `/timeline?zoom=year&detail=activity` — Sets initial Gantt zoom level and detail.

### Mobile Responsive Behavior

| Page | Mobile Adaptation |
|------|-------------------|
| Dashboard | Stat cards stack vertically (2-column on tablet, 1-column on phone). Panels stack. |
| Workplan | Sidebar collapses to a top dropdown selector. Content area is full-width. Hover actions become visible by default (no hover on touch). |
| Timeline | Gantt scrolls horizontally. Filter controls collapse into a dropdown. Tap replaces hover for tooltips. |
| Resources | Card grid collapses to single column. |
| Profile | Single column form. |
| Admin: Team | Table becomes a card list on small screens. |

---

## 3. Data Model (Conceptual)

This section defines the logical data entities. It is not a database schema — column types, indexes, and constraints are implementation details.

### 3.1 Workstream

The top-level organizational unit. Represents a major area of work (e.g., "WS1: Information Needs Assessment").

| Field | Required | Description |
|-------|----------|-------------|
| id | Yes | UUID primary key |
| code | Yes | Unique short code (e.g., "WS1", "WS2B", "DA-P1"). Used in URLs and display. |
| name | Yes | Full name (e.g., "Information Needs Assessment") |
| short_name | Yes | Abbreviated name for sidebar display (e.g., "Needs Assessment") |
| description | No | Purpose or objective text |
| start_date | Yes | Calendar date (no month numbers) |
| end_date | Yes | Calendar date (no month numbers) |
| color | Yes | Color identifier from the workstream palette (see Section 10) |
| owner_id | No | FK to team_members. The person primarily responsible. |
| sort_order | Yes | Integer for display ordering |
| created_at | Yes | Timestamp |
| updated_at | Yes | Timestamp |

**Constraints:** `code` is unique. `end_date >= start_date`.

### 3.2 Activity Group (Optional)

An optional organizational layer within a workstream. Groups related activities together but carries no dates or status of its own — those are derived from its child activities.

| Field | Required | Description |
|-------|----------|-------------|
| id | Yes | UUID primary key |
| code | Yes | Unique code (e.g., "1.1", "2.1") |
| name | Yes | Group name (e.g., "Scoping and Methodology Development") |
| workstream_id | Yes | FK to workstreams |
| sort_order | Yes | Integer for display ordering |
| created_at | Yes | Timestamp |
| updated_at | Yes | Timestamp |

**Constraints:** `code` is unique. An activity group has no `start_date`, `end_date`, or `status`. Its date range is the min(start_date)..max(end_date) of its child activities. Its progress is derived from child activity statuses.

### 3.3 Activity

A discrete piece of work within a workstream. The primary unit people interact with daily.

| Field | Required | Description |
|-------|----------|-------------|
| id | Yes | UUID primary key |
| code | Yes | Activity code (e.g., "1.1.1", "2.1.3"). Unique within the workstream. |
| name | Yes | Activity name/description |
| output | No | Expected output or result |
| workstream_id | Yes | FK to workstreams |
| activity_group_id | No | FK to activity_groups (nullable — activities can exist without a group) |
| start_date | Yes | Calendar date |
| end_date | Yes | Calendar date |
| status | Yes | One of: `not_started`, `in_progress`, `complete`, `delayed` |
| assigned_to | No | FK to team_members. Who is doing this work. |
| notes | No | Free-text notes |
| sort_order | Yes | Integer for display ordering |
| created_at | Yes | Timestamp |
| updated_at | Yes | Timestamp |

**Constraints:** `end_date >= start_date`. `code` is unique within the workstream scope.

### 3.4 Task

A granular sub-item under an activity. Tasks are optional — an activity can stand alone without tasks.

| Field | Required | Description |
|-------|----------|-------------|
| id | Yes | UUID primary key |
| code | No | Optional code (e.g., "1.1.1a"). Not required — tasks can just have names. |
| name | Yes | Task description |
| activity_id | Yes | FK to activities |
| start_date | No | Calendar date. If null, inherits from parent activity. |
| end_date | No | Calendar date. If null, inherits from parent activity. |
| status | Yes | One of: `not_started`, `in_progress`, `complete`, `delayed` |
| assigned_to | No | FK to team_members. If null, inherits from parent activity. |
| sort_order | Yes | Integer for display ordering |
| created_at | Yes | Timestamp |
| updated_at | Yes | Timestamp |

### 3.5 Deliverable

A milestone output tied to a workstream. Deliverables are separate from the activity hierarchy — they represent *what gets produced*, not the work to produce it.

| Field | Required | Description |
|-------|----------|-------------|
| id | Yes | UUID primary key |
| name | Yes | Deliverable name (e.g., "Stakeholder Information Needs Report") |
| description | No | Details about what this deliverable includes |
| workstream_id | Yes | FK to workstreams |
| due_date | Yes | Calendar date when the deliverable is expected |
| status | Yes | One of: `not_started`, `in_progress`, `complete`, `delayed` |
| completion_date | No | Auto-set when status changes to `complete`. Cleared if status changes away from `complete`. |
| assigned_to | No | FK to team_members |
| notes | No | Free-text notes |
| sort_order | Yes | Integer for display ordering |
| created_at | Yes | Timestamp |
| updated_at | Yes | Timestamp |

### 3.6 Dependency

A finish-to-start relationship between two items. Dependencies are **informational only** — they produce warnings, not enforcement.

| Field | Required | Description |
|-------|----------|-------------|
| id | Yes | UUID primary key |
| predecessor_type | Yes | Entity type: `activity`, `task`, or `deliverable` |
| predecessor_id | Yes | UUID of the predecessor item |
| successor_type | Yes | Entity type: `activity`, `task`, or `deliverable` |
| successor_id | Yes | UUID of the successor item |
| dependency_type | Yes | Always `finish_to_start` (only type supported in v2) |
| created_at | Yes | Timestamp |

**Constraints:**
- Predecessor and successor cannot be the same item.
- Circular dependency validation: before creating a dependency, the system walks the graph to ensure no cycle would be introduced. Rejects the creation with an error message if a cycle is detected.
- A dependency is considered **violated** when the predecessor is not `complete` and the successor's `start_date` has passed.

### 3.7 Attachment

A file attached to a workstream, activity, or deliverable. Uses polymorphic association.

| Field | Required | Description |
|-------|----------|-------------|
| id | Yes | UUID primary key |
| parent_type | Yes | Entity type: `workstream`, `activity`, `deliverable` |
| parent_id | Yes | UUID of the parent item |
| file_name | Yes | Original file name |
| file_url | Yes | Storage URL (Supabase Storage) |
| file_size | No | Size in bytes |
| mime_type | No | MIME type |
| uploaded_by | Yes | FK to team_members |
| created_at | Yes | Timestamp |

### 3.8 Resource

A shared reference item (link or file) in the project-level resource repository. Distinct from attachments: resources are standalone shared items, not tied to a specific workplan item.

| Field | Required | Description |
|-------|----------|-------------|
| id | Yes | UUID primary key |
| label | Yes | Display name |
| description | No | What this resource is for |
| type | Yes | `link` or `file` |
| url | Conditional | Required if type is `link`. The URL. |
| file_name | Conditional | Required if type is `file`. Original file name. |
| file_url | Conditional | Required if type is `file`. Storage URL. |
| file_size | No | Size in bytes (files only) |
| created_by | Yes | FK to team_members |
| created_at | Yes | Timestamp |
| updated_at | Yes | Timestamp |

### 3.9 Team Member

A person with access to the application. Replaces the v1 `profiles`, `teams`, and `app_roles` tables with a single flat structure.

| Field | Required | Description |
|-------|----------|-------------|
| id | Yes | UUID primary key (FK to auth.users) |
| email | Yes | Login email (unique) |
| full_name | Yes | Display name |
| title | No | Professional title (e.g., "Infostructure Lead", "Data Analyst") |
| location | No | Location |
| phone | No | Phone number |
| bio | No | Short bio (500 char max) |
| permission_level | Yes | One of: `admin`, `member`, `viewer` |
| is_active | Yes | Whether the user can log in. Default: true. |
| avatar_url | No | Profile picture URL |
| last_login_at | No | Timestamp of last login |
| invited_by | No | FK to team_members (who invited this person) |
| created_at | Yes | Timestamp |
| updated_at | Yes | Timestamp |

**Constraints:** `email` is unique. `permission_level` must be one of the three values.

### Entity Relationship Summary

```
Workstream (1) ──→ (many) Activity Group (optional)
Workstream (1) ──→ (many) Activity
Workstream (1) ──→ (many) Deliverable
Activity Group (1) ──→ (many) Activity
Activity (1) ──→ (many) Task
Any item ──→ (many) Attachment
Any item ──→ (many) Dependency (as predecessor or successor)
Team Member ──→ assigned to Activities, Tasks, Deliverables
Team Member ──→ owner of Workstreams
```

---

## 4. Roles & Permissions

### Permission Levels

| Level | Description |
|-------|-------------|
| **Admin** | Full CRUD on all workstreams, activities, tasks, deliverables, resources, and attachments. Can manage team members (invite, edit permissions, deactivate, reset passwords). Can delete any item. Can view audit logs. |
| **Member** | Can view all items. Can create and update workstreams; can delete workstreams they own. Full CRUD on activity groups, activities, tasks, deliverables, and resources (edit/delete restricted to own or assigned items). Can update the status of their assigned items. Can upload and manage their own attachments. Can create sheets and diagrams; manage sheet groups; CRUD rows on sheets they have access to; edit diagrams they have access to. |
| **Viewer** | Read-only access to all pages. Cannot create, edit, or delete anything. Cannot upload attachments. May post (and delete their own) row-comments on sheets they have access to. Useful for stakeholders who need visibility plus a comment-only channel. |

### What's Not Here

- **No teams.** There is no team grouping. All members see the same project.
- **No supervisor hierarchy.** There is no `supervisor_id` or subordinate chain. Work is assigned to people, not roles.
- **No role-based visibility.** Everyone sees everything. There is no "personal view" vs "team view" distinction. The whole team sees the whole project.
- **No approval queue.** Access is invite-only (see Section 4.1). There is no registration-then-wait-for-approval flow.

### 4.1 Access Management

1. **Invite-only.** An admin enters a new member's email, name, optional title, and permission level. The system sends an invitation email.
2. **First login.** The invited user clicks the email link, sets their password, and is immediately active. No approval step.
3. **Deactivation.** Admins can deactivate a member. Deactivated members cannot log in. Their data (assigned items, history) remains intact.
4. **Reactivation.** Admins can reactivate a deactivated member.
5. **Self-service profile.** Members and admins can edit their own profile fields (name, title, location, phone, bio, avatar). Email and permission level are read-only for non-admins.

### Permission Matrix

| Action | Admin | Member | Viewer |
|--------|-------|--------|--------|
| View all workstreams, activities, tasks, deliverables | Yes | Yes | Yes |
| Create workstream | Yes | Yes | No |
| Edit workstream | Yes | Yes (owner) | No |
| Delete workstream | Yes | Yes (owner only) | No |
| Create / edit / delete activity group | Yes | Yes | No |
| Create activity / task | Yes | Yes | No |
| Edit activity / task (own) | Yes | Yes | No |
| Edit activity / task (others') | Yes | No | No |
| Delete activity / task (own) | Yes | Yes | No |
| Delete activity / task (others') | Yes | No | No |
| Create deliverable | Yes | Yes | No |
| Edit/delete deliverable (own) | Yes | Yes | No |
| Edit/delete deliverable (others') | Yes | No | No |
| Update status (own assigned items) | Yes | Yes | No |
| Update status (any item) | Yes | No | No |
| Upload/delete attachments (own) | Yes | Yes | No |
| Delete attachments (others') | Yes | No | No |
| Create/edit/delete resources | Yes | Yes | No |
| Create sheet / diagram | Yes | Yes | No |
| Create / edit / delete sheet group | Yes | Yes | No |
| Comment on sheet rows (sheets they belong to) | Yes | Yes | Yes |
| Manage team members (invite, edit, delete, reset passwords) | Yes | No | No |
| View audit logs | Yes | No | No |
| Export (Excel, PDF) | Yes | Yes | Yes |

**Ownership note:** "Own" means items where `assigned_to = current_user` OR `created_by = current_user`. Workstream ownership is determined by `owner_id`.

---

## 5. Page Specifications

### 5.1 Dashboard (`/`)

The landing page. Shows project health at a glance. No editing happens here — everything links to the Workplan or is informational.

#### Stat Cards (top row, 4 cards)

| Card | Value | Detail |
|------|-------|--------|
| Total Deliverables | Count of all deliverables | e.g., "28" |
| Overall Progress | Percentage of all deliverables with status `complete` | e.g., "32%" |
| On Track | Count of deliverables where `status != delayed` AND not overdue | Green accent |
| Needs Attention | Count of deliverables that are `delayed` OR overdue | Red/amber accent |

#### Upcoming Deadlines Panel

- Shows deliverables and activities with `end_date` (or `due_date` for deliverables) within the next 30 days that are not `complete`.
- Sorted by date ascending.
- Each row shows: item name, workstream code (color-coded badge), date, status badge, assigned person's avatar/initials.
- Clicking a row navigates to `/workplan/:workstream_code` with the relevant item highlighted or scrolled to.
- If no upcoming items, show an empty state: "No deadlines in the next 30 days."
- Maximum 10 items displayed, with a "View all in Workplan" link if more exist.

#### Items Needing Attention Panel

- Shows items (activities, tasks, deliverables) that match any of these conditions:
  - **Overdue:** `end_date` (or `due_date`) has passed, status is not `complete`.
  - **Delayed:** Status is `delayed`.
  - **Dependency violated:** A predecessor is not complete but this item's `start_date` has passed.
- Each row shows: item name, type badge (Activity / Task / Deliverable), workstream code, how many days overdue (for overdue items), or "Blocked by [predecessor name]" (for dependency issues).
- Sorted by severity: overdue first (most days overdue at top), then delayed, then blocked.
- Clicking a row navigates to the item in the Workplan.
- Maximum 10 items. "View all" link if more exist.

#### Progress by Workstream

- Horizontal stacked bar chart, one bar per workstream.
- Each bar shows the proportion of: complete (green), in progress (blue), delayed (red), not started (gray).
- Bar label: workstream code + short name.
- Bars are ordered by workstream sort_order.
- The metric shown is based on **activities** (not deliverables) within each workstream, since activities are the actual work items.

#### Activity Status Breakdown

- Four pill-shaped badges showing total counts across all activities:
  - Not Started (gray) — count
  - In Progress (blue) — count
  - Complete (green) — count
  - Delayed (red) — count
- Each pill is clickable: navigates to `/workplan?status=<status>` to show a filtered view.

---

### 5.2 Workplan (`/workplan`)

The central page for viewing and managing all work items. Split layout: sidebar + content area.

#### Left Sidebar

- **Width:** ~280px on desktop. Collapsible on mobile (becomes a dropdown at the top).
- **Content:** List of all workstreams, ordered by `sort_order`.
- Each item shows:
  - Workstream color indicator (left border or dot)
  - Workstream code (bold, e.g., "WS1")
  - Short name (e.g., "Needs Assessment")
  - Mini progress bar (thin, showing % of activities complete)
- **Active state:** The selected workstream is highlighted. Its content appears in the main area.
- **"All Workstreams" option** at the top of the sidebar. When selected, the content area shows a summary view of all workstreams (name, date range, progress bar, deliverable count). Clicking a workstream in this summary view selects it.
- Clicking a workstream in the sidebar updates the URL to `/workplan/:code` without a full page reload.

#### Content Area (when a workstream is selected)

The content area has three sections: header, work items, and deliverables.

##### Workstream Header

- Workstream name (large), code badge (colored), date range (human-readable, e.g., "Jan 2026 - Mar 2026").
- Description text (if present), collapsible if long.
- Owner name + avatar (if set).
- Overall progress: "12 of 28 activities complete (43%)".
- **Edit button** (pencil icon): Opens workstream edit dialog. Visible to admin and workstream owner.
- **Attachment paperclip icon** with count. Click to expand attachment list/upload area.

##### Work Items Section

Displays the hierarchy: Activity Groups (if any) → Activities → Tasks.

**Activity Groups** (collapsible sections):
- If the workstream has activity groups, activities are shown nested under their group.
- Group header shows: code, name, derived date range (from children), derived progress (from children).
- Click the group header to collapse/expand.
- Activities not in any group appear in an "Ungrouped" section at the bottom.
- If the workstream has no activity groups at all, this layer is skipped entirely — activities display directly.

**Activities** (expandable rows):
- Each activity row shows:
  - Expand/collapse chevron (if tasks exist)
  - Activity code (e.g., "1.1.1")
  - Activity name
  - Status icon — clickable for **inline status editing**: clicking the status icon opens a small dropdown with the 4 status options. Selecting one updates immediately (optimistic update).
  - Date range (start - end)
  - Assigned person avatar/initials (or empty placeholder)
  - Attachment paperclip icon with count (if any attachments)
  - Dependency link icon (if any dependencies). Hovering shows a popover listing dependencies.
  - **Hover actions** (visible on row hover, or always visible on touch devices):
    - Edit (pencil) — Opens activity edit dialog
    - Delete (trash) — Confirmation dialog, then deletes
    - Add Task (+) — Opens task creation dialog pre-linked to this activity

**Tasks** (nested under expanded activity):
- Indented under their parent activity.
- Each task row shows: optional code, name, status icon (inline editable), date range (or "Inherits from activity" if no dates set), assigned person, hover actions (edit, delete).
- Tasks are visually lighter/smaller than activities to indicate hierarchy.

**"+ Add" Buttons:**
- "+ Add Activity Group" at the bottom of the work items section (only if the workstream already has at least one group, to avoid creating groups unnecessarily).
- "+ Add Activity" at the bottom of each activity group (or at the bottom of the work items section if no groups).
- "+ Add Task" at the bottom of each expanded activity's task list.
- These buttons are visible to admins and members.

##### Deliverables Section

Below the work items, separated by a divider and a "Deliverables" heading.

- Lists all deliverables for this workstream.
- Each deliverable row shows:
  - Deliverable name
  - Due date
  - Status icon (inline editable, same as activities)
  - Completion date (if complete, shown as "Completed: [date]")
  - Assigned person
  - Attachment paperclip icon with count
  - Dependency link icon with popover
  - Hover actions: Edit, Delete
- "+ Add Deliverable" button at the bottom.
- If no deliverables exist, show empty state: "No deliverables for this workstream."

#### Content Area (when "All Workstreams" is selected)

Shows a summary card for each workstream:
- Code + name
- Date range
- Activity count and progress bar
- Deliverable count (with how many complete)
- Owner avatar/name
- Click anywhere on the card to select that workstream

#### Workplan Dialogs

All create/edit operations open as modal dialogs (not inline editing, except for status).

**Activity Dialog** fields:
- Code (text, required)
- Name (text, required)
- Output (text, optional)
- Activity Group (dropdown, optional — only shown if the workstream has groups)
- Start Date (date picker, required)
- End Date (date picker, required, must be >= start date)
- Status (dropdown, default: Not Started)
- Assigned To (dropdown of team members, optional)
- Notes (textarea, optional)
- Attachments section: list existing, upload new, delete

**Task Dialog** fields:
- Code (text, optional)
- Name (text, required)
- Start Date (date picker, optional — shows "Inherits from activity" hint)
- End Date (date picker, optional)
- Status (dropdown, default: Not Started)
- Assigned To (dropdown, optional — shows "Inherits from activity" hint)

**Deliverable Dialog** fields:
- Name (text, required)
- Description (textarea, optional)
- Due Date (date picker, required)
- Status (dropdown, default: Not Started)
- Assigned To (dropdown, optional)
- Notes (textarea, optional)
- Attachments section

**Activity Group Dialog** fields:
- Code (text, required)
- Name (text, required)

**Workstream Dialog** fields:
- Code (text, required, unique)
- Name (text, required)
- Short Name (text, required)
- Description (textarea, optional)
- Start Date (date picker, required)
- End Date (date picker, required)
- Color (color picker from workstream palette)
- Owner (dropdown of team members, optional)

**Dependency Management:**
Within activity, task, and deliverable dialogs, a "Dependencies" section allows:
- Viewing existing dependencies (predecessor and successor lists).
- Adding a dependency: dropdown to search/select another item (activity, task, or deliverable). Only finish-to-start is supported.
- Removing a dependency: click X next to an existing one.
- If adding a dependency would create a cycle, show an inline error: "Cannot add: this would create a circular dependency."

---

### 5.3 Timeline (`/timeline`)

A read-only interactive Gantt chart visualizing the entire project timeline.

#### Controls Bar (top of page)

| Control | Options | Default |
|---------|---------|---------|
| Zoom | Quarter / Year / Full | Year |
| Detail Level | Workstream / Activity / Task | Workstream |
| Filter by Workstream | Multi-select dropdown of all workstreams | All selected |

#### Gantt Chart

**Time axis:**
- Horizontal axis shows months (labeled) grouped by quarters and years.
- Spans January 2026 - December 2027 (24 months).
- Zoom level determines how much is visible at once:
  - **Quarter:** 3 months visible, horizontal scroll for the rest.
  - **Year:** 12 months visible.
  - **Full:** All 24 months visible.

**Rows (left labels):**
- Determined by the detail level:
  - **Workstream level:** One row per workstream. Shows workstream code + short name.
  - **Activity level:** Rows grouped by workstream (workstream name as group header). One row per activity within each workstream.
  - **Task level:** Rows grouped by workstream, then by activity. One row per task. Activities without tasks still show as their own row.
- Rows are ordered by sort_order within their parent.

**Bars:**
- **Workstream bars:** Thick bars, filled with the workstream's color. Span `start_date` to `end_date`.
- **Activity bars:** Medium-thickness bars, slightly lighter shade of the workstream color. Span activity dates.
- **Task bars:** Thin bars, lightest shade of the workstream color. Span task dates (or parent activity dates if task has no dates).
- **Bar color modifiers:**
  - `complete` status: Green fill, regardless of workstream color.
  - `delayed` status: Red fill.
  - Overdue (end_date passed, not complete): Red tint overlay + small warning icon (!) at the end of the bar.

**Deliverable diamonds:**
- Deliverables appear as diamond shapes at their `due_date` position on the workstream's row (or on a dedicated "Deliverables" sub-row if at activity/task detail level).
- Diamond color: workstream color outline if not started/in progress, green fill if complete, red if delayed or overdue.

**Today marker:**
- Vertical dashed line at today's date, spanning the full height of the chart.
- Labeled "Today" at the top.
- Color: orange or amber.

**Dependency arrows:**
- Drawn as lines from the end of the predecessor bar to the start of the successor bar.
- Default color: gray (#999).
- **Violated dependencies** (predecessor not complete, successor's start_date passed): Red line.
- On hover over any bar, its dependency arrows highlight (thicker, brighter) while other arrows fade.

**Interactions:**
- **Hover:** Shows a tooltip with item details (name, dates, status, assigned person).
- **Click bar:** Opens a detail popover with:
  - Item name, type, code
  - Date range
  - Status badge
  - Assigned person
  - Dependencies (if any)
  - "View in Workplan" link that navigates to `/workplan/:code` with the item highlighted
- **Scroll:** Horizontal scroll when zoomed in. Vertical scroll when many rows.
- **Keyboard:** Left/Right arrow keys scroll horizontally. Home key jumps to today.

#### Export

- **PNG:** Renders the current Gantt view (including scroll position and zoom level) as a PNG image.
- **PDF:** Renders the full Gantt chart (all months, not just visible) as a multi-page PDF.
- Export button in the controls bar with dropdown: "Export as PNG" / "Export as PDF".

---

### 5.4 Resources (`/resources`)

A shared repository of links and files relevant to the project.

#### Layout

- Card grid (3 columns on desktop, 2 on tablet, 1 on mobile).
- Each card shows:
  - Resource label (title)
  - Type icon (link icon or file icon)
  - Description (truncated to 2 lines)
  - "Added by [name]" + date
  - For links: domain name shown below title
  - For files: file size + type shown below title
- **Search bar** at the top: filters cards by label and description (client-side).
- **"+ Add Resource" button** (admins and members only).

#### CRUD

- **Create:** Dialog with fields: Label, Description, Type (link/file toggle), URL (if link), File upload (if file).
- **Edit:** Same dialog, pre-populated. Visible to the creator and admins.
- **Delete:** Confirmation dialog. Visible to the creator and admins.
- Clicking a link-type resource opens the URL in a new tab.
- Clicking a file-type resource downloads the file.

#### Relationship to Attachments

Resources and attachments are distinct concepts:
- **Resources** live on the Resources page. They are project-level shared items.
- **Attachments** live on individual workplan items (workstreams, activities, deliverables). They are managed within the Workplan item dialogs.

The Resources page does NOT show attachments. Item attachments are only visible within their parent item's context in the Workplan.

---

### 5.5 Profile (`/profile`)

Personal settings for the logged-in user.

#### Editable Fields

| Field | Input Type | Validation |
|-------|-----------|------------|
| Full Name | Text | Required, max 100 chars |
| Title | Text | Optional, max 100 chars |
| Location | Text | Optional, max 100 chars |
| Phone | Text | Optional, max 20 chars |
| Bio | Textarea | Optional, max 500 chars |
| Avatar | Image upload | Optional, max 2MB, jpg/png |

#### Read-Only Fields

| Field | Source |
|-------|--------|
| Email | From auth system |
| Permission Level | Set by admin |
| Member Since | `created_at` date |

#### Change Password

- Separate section or button that opens a dialog.
- Fields: Current Password, New Password, Confirm New Password.
- Password requirements: minimum 8 characters.
- Success: Toast notification "Password updated."

---

### 5.6 Admin: Team Management (`/admin/team`)

Admin-only page for managing team members.

#### User Table

| Column | Description |
|--------|-------------|
| Name | Full name (with avatar) |
| Email | Login email |
| Title | Professional title |
| Permission | Badge: Admin / Member / Viewer |
| Status | Active / Inactive badge |
| Last Login | Relative time (e.g., "2 days ago") or "Never" |
| Actions | Edit, Deactivate/Reactivate buttons |

- Sortable by any column.
- Search/filter bar: search by name or email.

#### Invite New Member

- Button: "+ Invite Member"
- Dialog fields:
  - Email (required, must be valid email, must not already exist)
  - Full Name (required)
  - Title (optional)
  - Permission Level (dropdown: Admin / Member / Viewer, default: Member)
- On submit: System creates the user account and sends an invitation email with a link to set their password.
- The new member appears in the table immediately with status "Active" (they can log in once they set their password via the email link).

#### Edit Member

- Opens a dialog with:
  - Full Name (editable)
  - Title (editable)
  - Permission Level (dropdown, editable)
- Changes take effect immediately.

#### Deactivate / Reactivate

- **Deactivate:** Confirmation dialog: "Deactivate [name]? They will no longer be able to log in. Their assigned items will remain." Sets `is_active = false`.
- **Reactivate:** Sets `is_active = true`. No confirmation needed (safe action).
- Deactivated users appear in the table with a gray "Inactive" badge. They can be filtered out or shown.

#### What's Not Here

- No "delete user" option. Users can only be deactivated. This preserves data integrity (assigned items, audit trails).
- No bulk operations on users.
- No self-service sign-up. The only path to access is an admin invitation.

---

## 6. Status & Progress Model

### Status Values

All work items (activities, tasks, deliverables) use the same four statuses:

| Status | Display | Color | Meaning |
|--------|---------|-------|---------|
| `not_started` | Not Started | Gray (#6B7280) | Work has not begun |
| `in_progress` | In Progress | Blue (#3B82F6) | Work is actively underway |
| `complete` | Complete | Green (#10B981) | Work is finished |
| `delayed` | Delayed | Red (#EF4444) | Work is behind schedule (manually set) |

### Delayed vs. Overdue

These are distinct concepts:

- **Delayed** is a **manually set status.** A team member or admin explicitly marks an item as delayed. This is a judgment call — the person knows the work is behind and flags it.
- **Overdue** is a **system-calculated condition.** An item is overdue when its `end_date` (or `due_date` for deliverables) has passed and its status is not `complete`. The system shows overdue indicators automatically — no one needs to set it.

An item can be both delayed AND overdue (status is delayed, and the date has passed). Or it can be overdue without being delayed (status is still `in_progress`, but the date has passed — the person hasn't flagged it yet).

### Status Transitions

Any status can transition to any other status. There is no enforced progression (e.g., you don't have to go through `in_progress` before `complete`). This is intentional: real projects don't follow strict state machines.

### Progress Calculation

Progress is always expressed as: `(completed items / total items) * 100`, rounded to the nearest integer.

| Scope | What's Counted |
|-------|----------------|
| Project-level (Dashboard) | All deliverables |
| Workstream progress bar | All activities within the workstream |
| Activity Group progress | All activities within the group |
| Activity progress | If the activity has tasks: task completion ratio. If no tasks: binary (0% if not complete, 100% if complete). |

### Completion Side Effects

- When a **deliverable** status changes to `complete`, the system automatically sets `completion_date` to today's date.
- When a **deliverable** status changes away from `complete`, the system clears `completion_date` to null.
- No other automated status changes. The system never auto-completes a parent when children are done, or auto-starts a child when a parent starts. Status is always explicitly set.

---

## 7. Dependencies

### Supported Types

Only **finish-to-start** dependencies are supported. This means: the successor should not start until the predecessor is complete.

### Behavior

Dependencies are **informational, not blocking.** The system does not prevent someone from starting work on a successor whose predecessor is incomplete. Instead:

- **Gantt chart:** Dependency arrows are drawn from predecessor end to successor start. Violated dependencies are shown in red.
- **Workplan:** Items with violated dependencies show a warning icon. Hovering/clicking shows: "Waiting on: [predecessor name] (not yet complete)."
- **Dashboard:** Violated dependencies appear in the "Items Needing Attention" panel.

### Validation

- **Circular dependency prevention:** Before creating a dependency, the system traverses the dependency graph to check for cycles. If adding the dependency would create a cycle (A → B → C → A), the creation is rejected with an error: "Cannot add dependency: this would create a circular dependency chain."
- **Self-reference prevention:** An item cannot depend on itself.
- **Cross-type allowed:** An activity can depend on a deliverable, a task can depend on an activity, etc. All combinations of activity/task/deliverable are valid.

### Deletion Behavior

- Deleting an item automatically deletes all dependencies where it is a predecessor or successor.
- There is no "cascade" effect on the items themselves — only the dependency links are removed.

---

## 8. Notifications

### Approach

v2 uses **in-app notifications only**, surfaced through the Dashboard's "Items Needing Attention" panel. There are no email notifications, push notifications, or toast alerts for other users' actions.

### Conditions That Surface Items

| Condition | Display |
|-----------|---------|
| **Upcoming deadline (7 days)** | Shown in "Upcoming Deadlines" panel with date countdown |
| **Overdue** | Shown in "Items Needing Attention" with "[X] days overdue" |
| **Delayed status** | Shown in "Items Needing Attention" with "Delayed" badge |
| **Dependency violated** | Shown in "Items Needing Attention" with "Blocked by [name]" |

### What's Not Here

- No email notifications.
- No real-time toast/popup when someone else changes something (real-time sync keeps the data current, but there's no "Alice just updated WS1" notification).
- No notification preferences or settings.
- No notification history or "mark as read."

---

## 9. Export

### Excel Export

Available from the Workplan page. Generates a `.xlsx` file with the following sheets:

**Sheet 1: Summary**
- Project name, export date, exported by
- Total workstreams, activities, tasks, deliverables
- Overall progress percentage
- Status counts (not started, in progress, complete, delayed)
- Overdue item count

**Sheet 2: Workplan Detail**
- One row per activity, organized by workstream.
- Columns: Workstream Code, Workstream Name, Activity Group (if any), Activity Code, Activity Name, Output, Start Date, End Date, Status, Assigned To, Notes
- Color-coded status cells (green/blue/gray/red fills).
- Tasks listed as indented sub-rows under their parent activity.

**Sheet 3: Deliverables**
- One row per deliverable.
- Columns: Workstream Code, Deliverable Name, Description, Due Date, Status, Completion Date, Assigned To, Notes
- Sorted by due date.

**Sheet 4: Dependencies**
- One row per dependency.
- Columns: Predecessor Type, Predecessor Name, Predecessor Status, Successor Type, Successor Name, Successor Status, Violated (Yes/No)
- Sorted by predecessor name.

### Timeline Export

Available from the Timeline page.

- **PNG:** Captures the current visible Gantt view as rendered on screen (respects zoom level and scroll position).
- **PDF:** Renders the complete Gantt chart (full 24-month span, all items based on current detail level) as a multi-page landscape PDF.

---

## 10. Cross-Cutting Concerns

### Real-Time Updates

All data changes are broadcast via Supabase Realtime subscriptions. When one user creates, edits, or deletes an item, all other users viewing the same data see the change within seconds without refreshing.

- React Query caches are invalidated when realtime events arrive.
- Optimistic updates are used for status changes (the UI updates immediately, then confirms with the server).
- If an optimistic update fails (e.g., network error), the UI rolls back to the previous state and shows an error toast.

### Date Handling

- **v2 uses calendar dates only.** All date fields are ISO date strings (YYYY-MM-DD).
- The legacy month-number system (1-24) is not used in v2. Migration converts month numbers to calendar dates (see Section 12).
- Date display format: "Jan 15, 2026" (short month, day, year). Configurable per user is out of scope.
- Date pickers use standard calendar controls with min/max constraints where applicable.

### Color System

**Workstream Palette (12 colors):**

| Identifier | Hex | Usage |
|------------|-----|-------|
| `blue` | #3B82F6 | |
| `indigo` | #6366F1 | |
| `violet` | #8B5CF6 | |
| `purple` | #A855F7 | |
| `pink` | #EC4899 | |
| `rose` | #F43F5E | |
| `orange` | #F97316 | |
| `amber` | #F59E0B | |
| `emerald` | #10B981 | |
| `teal` | #14B8A6 | |
| `cyan` | #06B6D4 | |
| `sky` | #0EA5E9 | |

Each workstream is assigned one color. The admin/creator selects it when creating/editing a workstream. Colors are used for: sidebar indicators, Gantt bars, progress charts, and workstream badges throughout the app.

**Status Colors (fixed):**

| Status | Color |
|--------|-------|
| Not Started | Gray (#6B7280) |
| In Progress | Blue (#3B82F6) |
| Complete | Green (#10B981) |
| Delayed | Red (#EF4444) |

**Overdue Indicator:** Red tint (#FEE2E2 background) + warning icon. Applies to any non-complete item past its end/due date.

### Form Validation

- All required fields show inline error messages on blur and on submit attempt.
- Error message format: "[Field name] is required." or "[Field name] must be [constraint]."
- Date validation: end date >= start date, shown as inline error on the end date field.
- Unique constraints (e.g., workstream code, email) are validated on blur with a server check.
- Forms disable the submit button while a submission is in flight.

### Toast Notifications

- **Success:** Green toast, auto-dismisses after 3 seconds. Used for: item created, item updated, item deleted, export complete.
- **Error:** Red toast, persists until dismissed. Used for: save failed, network error, permission denied.
- **Warning:** Amber toast, auto-dismisses after 5 seconds. Used for: dependency violation created, circular dependency prevented.
- Toasts stack in the bottom-right corner, max 3 visible.

### Confirmation Dialogs

Required before any destructive action:
- Deleting a workstream: "Delete [name]? This will also delete all activities, tasks, deliverables, and attachments within this workstream. This cannot be undone."
- Deleting an activity with tasks: "Delete [name]? This will also delete [N] tasks. This cannot be undone."
- Deleting a deliverable: "Delete [name]? This cannot be undone."
- Deactivating a user: "Deactivate [name]? They will no longer be able to log in."
- Dialogs have a "Cancel" button (default focus) and a red "Delete" / "Deactivate" button.

### Loading & Empty States

- **Loading:** Skeleton placeholders matching the layout shape (not spinners) for initial page loads. Inline spinners for individual operations (e.g., status change).
- **Empty states:** Each list/section has a meaningful empty state message with a call to action:
  - No workstreams: "No workstreams yet. Create your first workstream to get started." + button.
  - No activities in a workstream: "No activities yet. Add an activity to start tracking work." + button.
  - No deliverables: "No deliverables for this workstream." + button.
  - No resources: "No shared resources yet. Add a link or file to share with the team." + button.
  - Dashboard with no data: "Welcome! Create a workstream in the Workplan to get started."

### Authentication

- Email/password login.
- Forgot password flow (sends reset email via Supabase Auth).
- No self-registration. All access is via admin invitation.
- Session persistence: JWT tokens via Supabase Auth, auto-refresh.
- Unauthenticated users are redirected to the login page.
- Deactivated users who attempt to log in see: "Your account has been deactivated. Contact an administrator."

### Error Handling

- **Network errors:** Red toast with "Something went wrong. Please try again." Retry button if applicable.
- **Permission errors (403):** Red toast with "You don't have permission to do that."
- **Not found (404):** Redirect to a simple "Page not found" view with a link back to Dashboard.
- **Supabase RLS violations:** Caught and shown as permission errors (not raw database errors).

---

## 11. What's Explicitly Out of Scope for v2

The following features are intentionally not included. This is not a backlog — it's a conscious decision to keep the tool focused.

| Feature | Reason |
|---------|--------|
| **Multi-project support** | This tool tracks one project. If another project needs tracking, it gets its own instance. |
| **Comments / threads** | Adds social complexity. Use Slack/Teams for discussion. |
| **Audit log / change history** | Valuable but not essential for a small team. Everyone knows who changed what. |
| **Bulk updates** | Small team, small number of items. Individual updates are fine. |
| **Custom fields** | The data model covers the known needs. Custom fields add schema complexity for marginal value. |
| **Recurring tasks** | Project work is not recurring. |
| **Time tracking** | Out of scope. Use a dedicated time tracker if needed. |
| **Email notifications** | Adds infrastructure complexity (email service, preferences, unsubscribe). Dashboard surfacing is sufficient for a small team. |
| **PWA / offline support** | Team has reliable internet. Not worth the caching complexity. |
| **Calendar integrations** | Use the export feature and add dates manually if needed. |
| **Multiple dependency types** | Start-to-start, finish-to-finish, start-to-finish are overkill. Finish-to-start covers the real need. |
| **Gantt drag-to-edit** | Gantt is read-only. Editing happens in the Workplan. This avoids accidental date changes and complex drag interaction bugs. |
| **Dashboard customization** | Fixed layout. The four panels cover the important views. |
| **Saved filters / views** | URL query parameters provide bookmarkable filtered views. No need for a saved-views system. |
| **Report templates / scheduled reports** | Use the export feature manually. |
| **Milestones as a separate entity** | Deliverables serve this purpose. No need for a separate milestone concept. |
| **Sub-tasks (below Task level)** | Three levels is enough. If a task feels too big, split it into multiple tasks. |

---

## 12. Migration Notes

### From v1 to v2

The existing database has data that must be migrated to the new schema. Here is the mapping:

#### Workstream → Workstream

| v1 Field | v2 Field | Transformation |
|----------|----------|----------------|
| `id` | `id` | Keep |
| `code` | `code` | Keep |
| `name` | `name` | Keep |
| `short_name` | `short_name` | Keep |
| `purpose` | `description` | Rename |
| `start_month` | `start_date` | Convert: month N → first day of the Nth month from Jan 2026. E.g., month 1 → 2026-01-01, month 4 → 2026-04-01. |
| `end_month` | `end_date` | Convert: month N → last day of the Nth month from Jan 2026. E.g., month 3 → 2026-03-31, month 24 → 2027-12-31. |
| `color` | `color` | Map old identifiers (ws1, ws2, etc.) to new palette identifiers. |
| `role` | — | Drop. No role-based separation in v2. |
| `owner_id` | `owner_id` | Keep (FK will point to team_members instead of profiles). |
| `sort_order` | `sort_order` | Keep |

**DA Phases → Workstreams:** Data Analyst "phases" from the v1 `phases` table are migrated as additional workstreams with codes like "DA-P1", "DA-P2", etc. This unifies the two separate hierarchies into one.

#### Phase → Activity Group (conditional)

v1 Phases that are used as organizational containers within IL workstreams (P1-P5) are migrated to Activity Groups within their respective workstreams. Phases that contain no activities are dropped.

| v1 Field | v2 Field | Transformation |
|----------|----------|----------------|
| `id` | `id` | Keep |
| `number` → `name` | `code` | Construct code from phase number (e.g., "P1") |
| `name` | `name` | Keep |
| `phase_id` → workstream lookup | `workstream_id` | Determine parent workstream from activity relationships |
| `sort_order` | `sort_order` | Keep |

**Note:** `start_month`, `end_month`, `objective`, `role`, `owner_id` are dropped. Activity groups derive dates from children and have no status/role.

#### Activity Group (v1) → Activity Group (v2)

Direct mapping. The v1 `activity_groups` table maps cleanly to v2.

| v1 Field | v2 Field |
|----------|----------|
| `id` | `id` |
| `code` | `code` |
| `name` | `name` |
| `workstream_id` | `workstream_id` |
| `sort_order` | `sort_order` |

Drop: `phase_id`, `start_date`, `end_date` (v2 activity groups have no dates).

#### Activity → Activity

| v1 Field | v2 Field | Transformation |
|----------|----------|----------------|
| `id` | `id` | Keep |
| `activity_id` | `code` | Rename |
| `description` | `name` | Rename |
| `output` | `output` | Keep |
| `workstream_id` | `workstream_id` | Keep |
| `activity_group_id` | `activity_group_id` | Keep |
| `start_month` / `start_date` | `start_date` | Use `start_date` if present, else convert `start_month` |
| `end_month` / `end_date` | `end_date` | Use `end_date` if present, else convert `end_month` |
| `status` | `status` | Keep |
| `owner_id` | `assigned_to` | Rename |
| `sort_order` | `sort_order` | Keep |

Drop: `phase_id` (replaced by activity_group_id → workstream relationship), `created_by`.

#### Sub-Activity → Task (rename)

The v1 concept of "sub-activities" under activities maps directly to v2 "tasks." If sub-activities exist in the current schema (they may be stored as activities with a parent reference), they are migrated as tasks.

| v1 Field | v2 Field | Transformation |
|----------|----------|----------------|
| `id` | `id` | Keep |
| `sub_activity_id` | `code` | Rename (optional in v2) |
| `description` | `name` | Rename |
| `activity_id` (parent) | `activity_id` | Keep |
| `start_date` | `start_date` | Keep (nullable in v2) |
| `end_date` | `end_date` | Keep (nullable in v2) |
| `status` | `status` | Keep |
| `owner_id` | `assigned_to` | Rename |
| `sort_order` | `sort_order` | Keep |

#### Deliverable → Deliverable

| v1 Field | v2 Field | Transformation |
|----------|----------|----------------|
| `id` | `id` | Keep |
| `name` | `name` | Keep |
| `notes` | `description` + `notes` | Split if appropriate, or keep in notes |
| `workstream_id` | `workstream_id` | Keep |
| `target_month` | `due_date` | Convert: month N → last day of that month. E.g., month 3 → 2026-03-31. |
| `due_date` | `due_date` | Use if already set (takes precedence over target_month) |
| `status` | `status` | Keep |
| `actual_completion_date` | `completion_date` | Rename |
| `owner_id` | `assigned_to` | Rename |
| `sort_order` | `sort_order` | Keep |

Drop: `role`, `workstream_code`, `phase_number`, `phase_id`, `created_by`.

#### Profile → Team Member

| v1 Field | v2 Field | Transformation |
|----------|----------|----------------|
| `id` | `id` | Keep (same auth.users FK) |
| `email` | `email` | Keep |
| `full_name` | `full_name` | Keep |
| — | `title` | Set from v1 role name or leave empty |
| — | `permission_level` | Map: `is_admin = true` → `admin`, else → `member` |
| — | `is_active` | Map: `approval_status = 'approved'` → `true`, else → `false` |
| `avatar_url` | `avatar_url` | Keep |
| `last_login_at` | `last_login_at` | Keep |
| `created_at` | `created_at` | Keep |

Drop: `team_id`, `role_id`, `supervisor_id`, `approval_status`, `approved_by`, `approved_at`.

#### Tables Dropped Entirely

| v1 Table | Reason |
|----------|--------|
| `teams` | No team concept in v2 |
| `app_roles` | Replaced by simple `permission_level` enum |
| `phases` | Merged into workstreams (DA phases) or activity groups (IL phases) |

#### New Tables (created empty)

| v2 Table | Content at Migration |
|----------|---------------------|
| `dependencies` | Empty. Users add dependencies after migration. |
| `attachments` | Empty. Users upload attachments after migration. |
| `resources` | Migrate from v1 `user_resources` if that table exists, otherwise empty. |

### Migration Strategy

1. Create new v2 tables alongside v1 tables.
2. Run data migration scripts that copy and transform data.
3. Verify data integrity (counts match, no orphaned references).
4. Switch the application to v2 schema.
5. Drop v1 tables after confirming everything works.

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| BHIS | Belize Health Information System |
| CDEP/DWAP | Data Warehouse & Analytics Platform |
| FHIR | Fast Healthcare Interoperability Resources (HL7 standard) |
| MOHW | Ministry of Health and Wellness (Belize) |
| Epi Unit | Epidemiology Unit |
| BL-L1048 | IDB project code for the health system improvement program |
| RLS | Row Level Security (Supabase/PostgreSQL feature) |
| Optimistic update | UI updates immediately before server confirms, rolls back on failure |
