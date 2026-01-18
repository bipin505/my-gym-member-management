-- Add GST number field to gyms table
ALTER TABLE gyms
  ADD COLUMN IF NOT EXISTS gst_number TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN gyms.gst_number IS 'GST/Tax registration number for the gym (shown on invoices)';
