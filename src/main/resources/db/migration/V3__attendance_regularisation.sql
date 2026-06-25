-- V3: Attendance regularisation refactor
-- Adds quality status + deduction/overtime fields to attendances,
-- adds is_regularised to late/early records, and creates the
-- attendance_regularisation_requests table.
--
-- !! IMPORTANT: This script must be run ONCE PER TENANT SCHEMA !!
-- Run via psql with the appropriate search_path before executing, e.g.:
--
--   psql -U postgres -d your_db \
--     -c "SET search_path TO akhil_deploys, public;" \
--     -f V3__attendance_regularisation.sql
--
--   Then repeat for prabha_tech, yuwa_tech_solutions, etc.
--
-- The public schema (super-admin) does not use these tables, so skip it.

-- ─── 1. attendances table ───────────────────────────────────────────────────

-- Quality status: REGULAR | IRREGULAR | REGULARISED
ALTER TABLE attendances
    ADD COLUMN IF NOT EXISTS attendance_status VARCHAR(20) DEFAULT 'REGULAR';

-- Deduction fields (computed from late/early/shortage minutes)
ALTER TABLE attendances
    ADD COLUMN IF NOT EXISTS deduction_minutes INT DEFAULT 0;

ALTER TABLE attendances
    ADD COLUMN IF NOT EXISTS deduction_amount DOUBLE PRECISION DEFAULT 0;

-- Overtime in minutes (mirrors overtime_second but pre-converted for payroll)
ALTER TABLE attendances
    ADD COLUMN IF NOT EXISTS overtime_minutes INT DEFAULT 0;

-- Regularisation quick-flag: NONE | HAS_PENDING | REGULARISED
ALTER TABLE attendances
    ADD COLUMN IF NOT EXISTS regularisation_status VARCHAR(20) DEFAULT 'NONE';

-- Replace any old status index with one covering the new column
DROP INDEX IF EXISTS idx_attendance_status_date;
CREATE INDEX IF NOT EXISTS idx_attendance_status_date
    ON attendances (attendance_status, attendance_date);

-- ─── 2. attendance_late_come_early_out table ─────────────────────────────────

ALTER TABLE attendance_late_come_early_out
    ADD COLUMN IF NOT EXISTS is_regularised BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── 3. attendance_regularisation_requests table ─────────────────────────────

CREATE TABLE IF NOT EXISTS attendance_regularisation_requests (
    -- BaseEntity fields (managed by JPA auditing)
    id                       BIGSERIAL     PRIMARY KEY,
    is_active                BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at               TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMP     NOT NULL DEFAULT NOW(),

    -- Core
    -- attendance_id is nullable: OT-only requests may not reference a specific row
    attendance_id            BIGINT        REFERENCES attendances(id),
    employee_id              BIGINT        NOT NULL REFERENCES employees(id),
    company_id               BIGINT        NOT NULL REFERENCES companies(id),

    request_type             VARCHAR(30)   NOT NULL,   -- matches @Column(length = 30)
    status                   VARCHAR(25)   NOT NULL DEFAULT 'PENDING_MANAGER', -- matches @Column(length = 25)
    reason                   TEXT,
    attachment_url           VARCHAR(500),

    -- Employee-requested corrections (nullable — set only when relevant to type)
    requested_check_in       TIME,          -- LocalTime → TIME (not TIMESTAMP)
    requested_check_out      TIME,          -- LocalTime → TIME (not TIMESTAMP)
    requested_overtime_hours DOUBLE PRECISION,

    -- Manager approval
    manager_id               BIGINT        REFERENCES employees(id),
    manager_approved_by      BIGINT        REFERENCES employees(id),  -- no _id suffix
    manager_approved_at      TIMESTAMP,
    manager_remarks          TEXT,

    -- HR approval
    hr_approved_by           BIGINT        REFERENCES employees(id),  -- no _id suffix
    hr_approved_at           TIMESTAMP,
    hr_remarks               TEXT,

    -- Rejection (either stage)
    rejected_by              BIGINT        REFERENCES employees(id),  -- no _id suffix
    rejected_at              TIMESTAMP,
    rejection_remarks        TEXT,
    rejection_stage          VARCHAR(10)
);

CREATE INDEX IF NOT EXISTS idx_reg_req_attendance ON attendance_regularisation_requests (attendance_id);
CREATE INDEX IF NOT EXISTS idx_reg_req_employee   ON attendance_regularisation_requests (employee_id);
CREATE INDEX IF NOT EXISTS idx_reg_req_company    ON attendance_regularisation_requests (company_id);
CREATE INDEX IF NOT EXISTS idx_reg_req_status     ON attendance_regularisation_requests (status);
CREATE INDEX IF NOT EXISTS idx_reg_req_manager    ON attendance_regularisation_requests (manager_id, status);

-- ─── 4. Notification type CHECK constraint ────────────────────────────────────
-- NotificationType is stored as VARCHAR. If a CHECK constraint exists on the column
-- (Hibernate/DDL may have generated one), drop it and replace it with the full set
-- including the new REGULARISATION_* values.

DO $$
DECLARE
    v_constraint TEXT;
BEGIN
    SELECT conname INTO v_constraint
    FROM   pg_constraint
    WHERE  conrelid = 'notifications'::regclass
      AND  contype  = 'c'
      AND  pg_get_constraintdef(oid) LIKE '%notification_type%';

    IF v_constraint IS NOT NULL THEN
        EXECUTE format('ALTER TABLE notifications DROP CONSTRAINT %I', v_constraint);
    END IF;

    ALTER TABLE notifications
        ADD CONSTRAINT notifications_notification_type_check
        CHECK (notification_type IN (
            'LEAVE_REQUEST', 'LEAVE_APPROVED', 'LEAVE_REJECTED',
            'ATTENDANCE_REQUEST', 'ATTENDANCE_APPROVED',
            'REGULARISATION_SUBMITTED',
            'REGULARISATION_APPROVED_BY_MANAGER',
            'REGULARISATION_REJECTED_BY_MANAGER',
            'REGULARISATION_APPROVED',
            'REGULARISATION_REJECTED',
            'PAYSLIP_GENERATED', 'ASSET_ASSIGNED',
            'TICKET_ASSIGNED', 'TICKET_RESOLVED',
            'POLICY_PUBLISHED',
            'GENERAL'
        ));
END;
$$;
