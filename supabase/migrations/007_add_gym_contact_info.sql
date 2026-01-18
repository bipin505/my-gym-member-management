-- Add phone and address fields to gyms table
ALTER TABLE gyms
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- Update comments
COMMENT ON COLUMN gyms.phone IS 'Gym contact phone number';
COMMENT ON COLUMN gyms.address IS 'Gym physical address';
