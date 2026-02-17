-- ============================================================================
-- Digital Health Tracker - Full Database Migration
-- Project: BL-L1048 Improving Efficiency, Quality, and Access in Belize's Health System
-- Database: Supabase (PostgreSQL)
-- ============================================================================

-- ===========================================
-- 1. Extensions
-- ===========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- 2. Enums
-- ===========================================
CREATE TYPE item_status AS ENUM ('not_started', 'in_progress', 'complete', 'delayed');
CREATE TYPE permission_level AS ENUM ('admin', 'member', 'viewer');
CREATE TYPE workstream_color AS ENUM ('blue', 'indigo', 'violet', 'purple', 'pink', 'rose', 'orange', 'amber', 'emerald', 'teal', 'cyan', 'sky');
CREATE TYPE dependency_item_type AS ENUM ('activity', 'task', 'deliverable');
CREATE TYPE attachment_parent_type AS ENUM ('workstream', 'activity', 'deliverable');
CREATE TYPE resource_type AS ENUM ('link', 'file');

-- ===========================================
-- 3. Tables (in FK dependency order)
-- ===========================================

-- 3.1 Team Members
CREATE TABLE team_members (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    title TEXT,
    location TEXT,
    phone TEXT,
    bio TEXT CHECK (char_length(bio) <= 500),
    permission_level permission_level NOT NULL DEFAULT 'member',
    is_active BOOLEAN NOT NULL DEFAULT true,
    avatar_url TEXT,
    last_login_at TIMESTAMPTZ,
    invited_by UUID REFERENCES team_members(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.2 Workstreams
CREATE TABLE workstreams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    color workstream_color NOT NULL,
    owner_id UUID REFERENCES team_members(id),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT workstreams_date_check CHECK (end_date >= start_date)
);

-- 3.3 Activity Groups
CREATE TABLE activity_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    workstream_id UUID NOT NULL REFERENCES workstreams(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.4 Activities
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    output TEXT,
    workstream_id UUID NOT NULL REFERENCES workstreams(id) ON DELETE CASCADE,
    activity_group_id UUID REFERENCES activity_groups(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status item_status NOT NULL DEFAULT 'not_started',
    assigned_to UUID REFERENCES team_members(id),
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT activities_date_check CHECK (end_date >= start_date),
    CONSTRAINT activities_code_per_workstream UNIQUE (workstream_id, code)
);

-- 3.5 Tasks
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT,
    name TEXT NOT NULL,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    start_date DATE,
    end_date DATE,
    status item_status NOT NULL DEFAULT 'not_started',
    assigned_to UUID REFERENCES team_members(id),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.6 Deliverables
CREATE TABLE deliverables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    workstream_id UUID NOT NULL REFERENCES workstreams(id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    status item_status NOT NULL DEFAULT 'not_started',
    completion_date DATE,
    assigned_to UUID REFERENCES team_members(id),
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.7 Dependencies
CREATE TABLE dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    predecessor_type dependency_item_type NOT NULL,
    predecessor_id UUID NOT NULL,
    successor_type dependency_item_type NOT NULL,
    successor_id UUID NOT NULL,
    dependency_type TEXT NOT NULL DEFAULT 'finish_to_start',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT dependencies_no_self_ref CHECK (predecessor_id != successor_id),
    CONSTRAINT dependencies_unique_pair UNIQUE (predecessor_type, predecessor_id, successor_type, successor_id)
);

-- 3.8 Attachments
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_type attachment_parent_type NOT NULL,
    parent_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    uploaded_by UUID NOT NULL REFERENCES team_members(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.9 Resources
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL,
    description TEXT,
    type resource_type NOT NULL,
    url TEXT,
    file_name TEXT,
    file_url TEXT,
    file_size BIGINT,
    created_by UUID NOT NULL REFERENCES team_members(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================
-- 4. Trigger: Auto-update updated_at
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_team_members
    BEFORE UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_workstreams
    BEFORE UPDATE ON workstreams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_activity_groups
    BEFORE UPDATE ON activity_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_activities
    BEFORE UPDATE ON activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_tasks
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_deliverables
    BEFORE UPDATE ON deliverables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_resources
    BEFORE UPDATE ON resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 5. Trigger: Deliverable completion_date
-- ===========================================
CREATE OR REPLACE FUNCTION handle_deliverable_completion_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'complete' AND (OLD.status IS DISTINCT FROM 'complete') THEN
        NEW.completion_date = CURRENT_DATE;
    ELSIF NEW.status != 'complete' AND (OLD.status = 'complete') THEN
        NEW.completion_date = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_deliverable_completion_date
    BEFORE UPDATE ON deliverables
    FOR EACH ROW EXECUTE FUNCTION handle_deliverable_completion_date();

-- ===========================================
-- 6. RLS Helper Function
-- ===========================================
CREATE OR REPLACE FUNCTION get_my_permission_level()
RETURNS permission_level AS $$
    SELECT permission_level
    FROM team_members
    WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ===========================================
-- 7. Enable RLS on All Tables
-- ===========================================
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workstreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 8. RLS Policies
-- ===========================================

-- ---- team_members ----
CREATE POLICY "team_members_select"
    ON team_members FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "team_members_insert"
    ON team_members FOR INSERT
    TO authenticated
    WITH CHECK (get_my_permission_level() = 'admin');

CREATE POLICY "team_members_update"
    ON team_members FOR UPDATE
    TO authenticated
    USING (get_my_permission_level() = 'admin')
    WITH CHECK (get_my_permission_level() = 'admin');

CREATE POLICY "team_members_delete"
    ON team_members FOR DELETE
    TO authenticated
    USING (get_my_permission_level() = 'admin');

-- ---- workstreams ----
CREATE POLICY "workstreams_select"
    ON workstreams FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "workstreams_insert"
    ON workstreams FOR INSERT
    TO authenticated
    WITH CHECK (get_my_permission_level() = 'admin');

CREATE POLICY "workstreams_update"
    ON workstreams FOR UPDATE
    TO authenticated
    USING (
        get_my_permission_level() = 'admin'
        OR owner_id = auth.uid()
    )
    WITH CHECK (
        get_my_permission_level() = 'admin'
        OR owner_id = auth.uid()
    );

CREATE POLICY "workstreams_delete"
    ON workstreams FOR DELETE
    TO authenticated
    USING (get_my_permission_level() = 'admin');

-- ---- activity_groups ----
CREATE POLICY "activity_groups_select"
    ON activity_groups FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "activity_groups_insert"
    ON activity_groups FOR INSERT
    TO authenticated
    WITH CHECK (get_my_permission_level() IN ('admin', 'member'));

CREATE POLICY "activity_groups_update"
    ON activity_groups FOR UPDATE
    TO authenticated
    USING (get_my_permission_level() = 'admin')
    WITH CHECK (get_my_permission_level() = 'admin');

CREATE POLICY "activity_groups_delete"
    ON activity_groups FOR DELETE
    TO authenticated
    USING (get_my_permission_level() = 'admin');

-- ---- activities ----
CREATE POLICY "activities_select"
    ON activities FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "activities_insert"
    ON activities FOR INSERT
    TO authenticated
    WITH CHECK (get_my_permission_level() IN ('admin', 'member'));

CREATE POLICY "activities_update"
    ON activities FOR UPDATE
    TO authenticated
    USING (
        get_my_permission_level() = 'admin'
        OR assigned_to = auth.uid()
    )
    WITH CHECK (
        get_my_permission_level() = 'admin'
        OR assigned_to = auth.uid()
    );

CREATE POLICY "activities_delete"
    ON activities FOR DELETE
    TO authenticated
    USING (
        get_my_permission_level() = 'admin'
        OR assigned_to = auth.uid()
    );

-- ---- tasks ----
CREATE POLICY "tasks_select"
    ON tasks FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "tasks_insert"
    ON tasks FOR INSERT
    TO authenticated
    WITH CHECK (get_my_permission_level() IN ('admin', 'member'));

CREATE POLICY "tasks_update"
    ON tasks FOR UPDATE
    TO authenticated
    USING (
        get_my_permission_level() = 'admin'
        OR assigned_to = auth.uid()
    )
    WITH CHECK (
        get_my_permission_level() = 'admin'
        OR assigned_to = auth.uid()
    );

CREATE POLICY "tasks_delete"
    ON tasks FOR DELETE
    TO authenticated
    USING (
        get_my_permission_level() = 'admin'
        OR assigned_to = auth.uid()
    );

-- ---- deliverables ----
CREATE POLICY "deliverables_select"
    ON deliverables FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "deliverables_insert"
    ON deliverables FOR INSERT
    TO authenticated
    WITH CHECK (get_my_permission_level() IN ('admin', 'member'));

CREATE POLICY "deliverables_update"
    ON deliverables FOR UPDATE
    TO authenticated
    USING (
        get_my_permission_level() = 'admin'
        OR assigned_to = auth.uid()
    )
    WITH CHECK (
        get_my_permission_level() = 'admin'
        OR assigned_to = auth.uid()
    );

CREATE POLICY "deliverables_delete"
    ON deliverables FOR DELETE
    TO authenticated
    USING (
        get_my_permission_level() = 'admin'
        OR assigned_to = auth.uid()
    );

-- ---- dependencies ----
CREATE POLICY "dependencies_select"
    ON dependencies FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "dependencies_insert"
    ON dependencies FOR INSERT
    TO authenticated
    WITH CHECK (get_my_permission_level() IN ('admin', 'member'));

CREATE POLICY "dependencies_update"
    ON dependencies FOR UPDATE
    TO authenticated
    USING (get_my_permission_level() IN ('admin', 'member'))
    WITH CHECK (get_my_permission_level() IN ('admin', 'member'));

CREATE POLICY "dependencies_delete"
    ON dependencies FOR DELETE
    TO authenticated
    USING (get_my_permission_level() IN ('admin', 'member'));

-- ---- attachments ----
CREATE POLICY "attachments_select"
    ON attachments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "attachments_insert"
    ON attachments FOR INSERT
    TO authenticated
    WITH CHECK (get_my_permission_level() IN ('admin', 'member'));

CREATE POLICY "attachments_delete"
    ON attachments FOR DELETE
    TO authenticated
    USING (
        get_my_permission_level() = 'admin'
        OR uploaded_by = auth.uid()
    );

-- ---- resources ----
CREATE POLICY "resources_select"
    ON resources FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "resources_insert"
    ON resources FOR INSERT
    TO authenticated
    WITH CHECK (get_my_permission_level() IN ('admin', 'member'));

CREATE POLICY "resources_update"
    ON resources FOR UPDATE
    TO authenticated
    USING (
        get_my_permission_level() = 'admin'
        OR created_by = auth.uid()
    )
    WITH CHECK (
        get_my_permission_level() = 'admin'
        OR created_by = auth.uid()
    );

CREATE POLICY "resources_delete"
    ON resources FOR DELETE
    TO authenticated
    USING (
        get_my_permission_level() = 'admin'
        OR created_by = auth.uid()
    );

-- ===========================================
-- 9. Indexes
-- ===========================================
CREATE INDEX idx_workstreams_sort_order ON workstreams(sort_order);
CREATE INDEX idx_activity_groups_workstream_sort ON activity_groups(workstream_id, sort_order);
CREATE INDEX idx_activities_workstream_sort ON activities(workstream_id, sort_order);
CREATE INDEX idx_activities_group ON activities(activity_group_id);
CREATE INDEX idx_activities_end_date ON activities(end_date);
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_assigned_to ON activities(assigned_to);
CREATE INDEX idx_tasks_activity_sort ON tasks(activity_id, sort_order);
CREATE INDEX idx_deliverables_workstream_sort ON deliverables(workstream_id, sort_order);
CREATE INDEX idx_deliverables_due_date ON deliverables(due_date);
CREATE INDEX idx_deliverables_status ON deliverables(status);
CREATE INDEX idx_dependencies_predecessor ON dependencies(predecessor_type, predecessor_id);
CREATE INDEX idx_dependencies_successor ON dependencies(successor_type, successor_id);
CREATE INDEX idx_attachments_parent ON attachments(parent_type, parent_id);
CREATE INDEX idx_resources_created_by ON resources(created_by);

-- ===========================================
-- 10. Enable Realtime
-- ===========================================
ALTER PUBLICATION supabase_realtime ADD TABLE team_members;
ALTER PUBLICATION supabase_realtime ADD TABLE workstreams;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE activities;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE deliverables;
ALTER PUBLICATION supabase_realtime ADD TABLE dependencies;
ALTER PUBLICATION supabase_realtime ADD TABLE attachments;
ALTER PUBLICATION supabase_realtime ADD TABLE resources;

-- ===========================================
-- 11. Storage Bucket for Attachments
-- ===========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false);
