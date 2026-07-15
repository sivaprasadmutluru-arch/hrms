-- Reverse-geocoded address, resolved asynchronously after clock-in/out (best-effort, may stay null).

ALTER TABLE attendance_activities
    ADD COLUMN clock_in_address varchar(500),
    ADD COLUMN clock_out_address varchar(500);

ALTER TABLE attendances
    ADD COLUMN check_in_address varchar(500),
    ADD COLUMN check_out_address varchar(500);
