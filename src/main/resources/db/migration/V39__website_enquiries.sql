CREATE TABLE IF NOT EXISTS public.website_enquiries (
 reference VARCHAR(32) PRIMARY KEY,name VARCHAR(100) NOT NULL,email VARCHAR(254) NOT NULL,phone VARCHAR(30),category VARCHAR(80) NOT NULL,message TEXT NOT NULL,
 submitted_at TIMESTAMPTZ NOT NULL,consent_at TIMESTAMPTZ NOT NULL,received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,payload_hash VARCHAR(64) NOT NULL,
 status VARCHAR(24) NOT NULL DEFAULT 'NEW',notes TEXT NOT NULL DEFAULT '',updated_at TIMESTAMPTZ,updated_by VARCHAR(254)
);
CREATE INDEX IF NOT EXISTS website_enquiry_queue_idx ON public.website_enquiries(status,received_at);
