-- GPS accuracy (meters) alongside the lat/long captured in V6.

ALTER TABLE attendance_activities
    ADD COLUMN clock_in_accuracy_meters double precision,
    ADD COLUMN clock_out_accuracy_meters double precision;

ALTER TABLE attendances
    ADD COLUMN check_in_accuracy_meters double precision,
    ADD COLUMN check_out_accuracy_meters double precision;
