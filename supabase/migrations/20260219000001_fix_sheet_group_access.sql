-- Fix is_sheet_member() to check sheet group membership
-- Previously only checked direct sheet_members + admin bypass.
-- Now also checks if the user belongs to the sheet's group via sheet_group_members.

CREATE OR REPLACE FUNCTION is_sheet_member(p_sheet_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    -- Direct sheet member
    SELECT 1 FROM sheet_members
    WHERE sheet_id = p_sheet_id
      AND team_member_id = auth.uid()
  )
  OR EXISTS (
    -- Member of the sheet's group
    SELECT 1 FROM sheets s
    JOIN sheet_group_members sgm ON sgm.sheet_group_id = s.group_id
    WHERE s.id = p_sheet_id
      AND sgm.team_member_id = auth.uid()
  )
  OR EXISTS (
    -- Admin bypass
    SELECT 1 FROM team_members
    WHERE id = auth.uid()
      AND permission_level = 'admin'
  );
$$;
