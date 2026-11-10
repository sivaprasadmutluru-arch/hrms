-- Stamp only completed tenant schema syncs. A model/provider change invalidates all stamps.
CREATE TABLE IF NOT EXISTS public.tenant_schema_versions (
    schema_name varchar(255) PRIMARY KEY,
    model_hash varchar(64) NOT NULL,
    synced_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
