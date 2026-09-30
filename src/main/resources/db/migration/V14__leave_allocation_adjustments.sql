-- Approved leave allocations are immutable. Amendments and cancellations are
-- stored as new requests linked to their original allocation for a complete audit trail.
-- Apply this to every tenant schema containing leave_allocation_requests.
ALTER TABLE leave_allocation_requests
    ADD COLUMN IF NOT EXISTS allocation_action varchar(20) NOT NULL DEFAULT 'GRANT',
    ADD COLUMN IF NOT EXISTS source_request_id bigint NULL,
    ADD COLUMN IF NOT EXISTS applied_days double precision NULL,
    ADD COLUMN IF NOT EXISTS lifecycle_status varchar(20) NOT NULL DEFAULT 'ACTIVE';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_leave_allocation_request_source'
    ) THEN
        ALTER TABLE leave_allocation_requests
            ADD CONSTRAINT fk_leave_allocation_request_source
            FOREIGN KEY (source_request_id) REFERENCES leave_allocation_requests(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leave_allocation_request_source
    ON leave_allocation_requests(source_request_id);

UPDATE leave_allocation_requests
SET applied_days = requested_days
WHERE status = 'APPROVED' AND allocation_action = 'GRANT' AND applied_days IS NULL;
