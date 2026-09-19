-- V13: Loan request notification types
-- The NotificationType enum gained LOAN_REQUEST_SUBMITTED / LOAN_REQUEST_APPROVED /
-- LOAN_REQUEST_REJECTED, but the notifications_notification_type_check CHECK
-- constraint was never updated to match, so submitting a loan request fails with
-- a check-constraint violation on every tenant schema still running the old list.
--
-- !! IMPORTANT: This script must be run ONCE PER TENANT SCHEMA !!
-- Run via psql with the appropriate search_path before executing, e.g.:
--
--   psql -U postgres -d your_db \
--     -c "SET search_path TO akhil_deploys, public;" \
--     -f V13__loan_request_notification_types.sql
--
--   Then repeat for prabha_tech, yuwa_tech_solutions, etc.
--
-- The public schema (super-admin) does not use this table, so skip it.

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
            'LOAN_REQUEST_SUBMITTED',
            'LOAN_REQUEST_APPROVED',
            'LOAN_REQUEST_REJECTED',
            'PAYSLIP_GENERATED', 'ASSET_ASSIGNED',
            'TICKET_ASSIGNED', 'TICKET_RESOLVED',
            'POLICY_PUBLISHED',
            'GENERAL'
        ));
END;
$$;
