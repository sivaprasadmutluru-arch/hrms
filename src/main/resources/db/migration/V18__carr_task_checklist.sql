-- Preserve all task data; checklist state lives on the existing versioned task.
DO $$
DECLARE t record;
BEGIN
 FOR t IN SELECT table_schema FROM information_schema.tables WHERE table_name='carr_responsibilities' AND table_type='BASE TABLE' LOOP
  EXECUTE format('ALTER TABLE %I.carr_responsibilities ADD COLUMN IF NOT EXISTS checklist_items text NOT NULL DEFAULT ''[]''',t.table_schema);
 END LOOP;
END $$;
