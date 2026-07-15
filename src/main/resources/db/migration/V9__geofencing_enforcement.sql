-- Per-company toggle: when true, self-service clock-in/out outside the fence (or missing GPS) is blocked
-- instead of just flagged. Admin-manual attendance entries are always exempt.

ALTER TABLE geo_fencing
    ADD COLUMN enforce_geofence boolean NOT NULL DEFAULT false;
