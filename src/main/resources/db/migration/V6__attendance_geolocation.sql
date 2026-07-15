-- Capture clock-in/clock-out GPS location and geofence status for attendance activities and daily summary.

ALTER TABLE attendance_activities
    ADD COLUMN clock_in_latitude double precision,
    ADD COLUMN clock_in_longitude double precision,
    ADD COLUMN clock_in_within_geofence boolean,
    ADD COLUMN clock_in_distance_meters double precision,
    ADD COLUMN clock_out_latitude double precision,
    ADD COLUMN clock_out_longitude double precision,
    ADD COLUMN clock_out_within_geofence boolean,
    ADD COLUMN clock_out_distance_meters double precision;

ALTER TABLE attendances
    ADD COLUMN check_in_latitude double precision,
    ADD COLUMN check_in_longitude double precision,
    ADD COLUMN check_in_within_geofence boolean,
    ADD COLUMN check_out_latitude double precision,
    ADD COLUMN check_out_longitude double precision,
    ADD COLUMN check_out_within_geofence boolean;
