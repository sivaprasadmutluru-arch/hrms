-- Execute with the target tenant schema selected in search_path (including public).
-- Existing tickets retain NULL department and their original assignee.
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS department_id BIGINT REFERENCES departments(id);
CREATE INDEX IF NOT EXISTS tickets_department_idx ON tickets(department_id);
