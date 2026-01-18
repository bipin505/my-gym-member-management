-- Drop the services table - we'll define services inline with members
DROP TABLE IF EXISTS services CASCADE;

-- Update member_services to support inline service definition
ALTER TABLE member_services
  DROP COLUMN IF EXISTS service_id,
  ADD COLUMN IF NOT EXISTS service_name TEXT NOT NULL DEFAULT 'Personal Training',
  ADD COLUMN IF NOT EXISTS service_type TEXT NOT NULL DEFAULT 'pt' CHECK (service_type IN ('pt', 'other')),
  ALTER COLUMN start_date DROP NOT NULL,
  ALTER COLUMN end_date DROP NOT NULL;

-- Update table comment
COMMENT ON TABLE member_services IS 'Services assigned to members. PT services have expiry dates, other services are perpetual.';
