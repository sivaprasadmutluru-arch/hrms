-- Repairs legacy receipt naming only. No punch or attendance rows are changed.
-- Back up the affected tables before executing with psql -v ON_ERROR_STOP=1.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $repair$
DECLARE
    tenant text;
    legacy text;
    canonical text;
    before_count bigint;
    after_count bigint;
BEGIN
    FOREACH tenant IN ARRAY ARRAY['pioneer_insurance_brokers_l_l_c', 'veracity_world_general_trading_llc'] LOOP
        EXECUTE format('SELECT count(*) FROM %I.biometric_punch_receipts', tenant) INTO before_count;
        FOR legacy, canonical IN SELECT * FROM (VALUES
            ('serialnumber', 'serial_number'), ('deviceuserid', 'device_user_id'),
            ('devicetime', 'device_time'), ('devicestatus', 'device_status'),
            ('processingstate', 'processing_state'), ('employeeid', 'employee_id')
        ) AS names(old_name, new_name) LOOP
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = tenant
                       AND table_name = 'biometric_punch_receipts' AND column_name = legacy) THEN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = tenant
                           AND table_name = 'biometric_punch_receipts' AND column_name = canonical) THEN
                    RAISE EXCEPTION 'Ambiguous receipt columns in %: %, %', tenant, legacy, canonical;
                END IF;
                EXECUTE format('ALTER TABLE %I.biometric_punch_receipts RENAME COLUMN %I TO %I', tenant, legacy, canonical);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = tenant
                           AND table_name = 'biometric_punch_receipts' AND column_name = canonical) THEN
                RAISE EXCEPTION 'Missing receipt column %.%', tenant, canonical;
            END IF;
        END LOOP;
        EXECUTE format('SELECT count(*) FROM %I.biometric_punch_receipts', tenant) INTO after_count;
        IF before_count <> after_count THEN RAISE EXCEPTION 'Receipt count changed for %', tenant; END IF;
        RAISE NOTICE '%: % receipts preserved', tenant, after_count;
    END LOOP;
END $repair$;
COMMIT;
