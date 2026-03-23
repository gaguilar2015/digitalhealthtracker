-- Add supervisor_id for team hierarchy (reports-to relationship)
ALTER TABLE team_members
  ADD COLUMN supervisor_id UUID REFERENCES team_members(id) ON DELETE SET NULL;

CREATE INDEX idx_team_members_supervisor ON team_members(supervisor_id);

ALTER TABLE team_members
  ADD CONSTRAINT team_members_no_self_supervisor CHECK (supervisor_id != id);
