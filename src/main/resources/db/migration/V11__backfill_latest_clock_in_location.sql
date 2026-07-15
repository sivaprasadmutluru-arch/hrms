-- Daily attendance keeps the first-in time but displays the latest clock-in location.
-- Backfill blank summary locations from the latest located activity in every tenant schema.
DO $$
DECLARE
    schema_row RECORD;
BEGIN
    FOR schema_row IN
        SELECT DISTINCT table_schema
        FROM information_schema.tables
        WHERE table_name = 'attendances'
          AND table_type = 'BASE TABLE'
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = schema_row.table_schema
              AND table_name = 'attendance_activities'
        ) THEN
            EXECUTE format($sql$
                WITH latest AS (
                    SELECT DISTINCT ON (employee_id, attendance_date)
                           employee_id, attendance_date,
                           clock_in_latitude, clock_in_longitude,
                           clock_in_within_geofence, clock_in_accuracy_meters,
                           clock_in_address
                    FROM %1$I.attendance_activities
                    WHERE clock_in_latitude IS NOT NULL
                      AND clock_in_longitude IS NOT NULL
                    ORDER BY employee_id, attendance_date,
                             in_datetime DESC NULLS LAST, id DESC
                )
                UPDATE %1$I.attendances a
                   SET check_in_latitude = l.clock_in_latitude,
                       check_in_longitude = l.clock_in_longitude,
                       check_in_within_geofence = l.clock_in_within_geofence,
                       check_in_accuracy_meters = l.clock_in_accuracy_meters,
                       check_in_address = l.clock_in_address
                  FROM latest l
                 WHERE a.employee_id = l.employee_id
                   AND a.attendance_date = l.attendance_date
                   AND a.check_in_latitude IS NULL
            $sql$, schema_row.table_schema);
        END IF;
    END LOOP;
END $$;
