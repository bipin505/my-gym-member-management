-- Add invoice_type column to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'membership' CHECK (invoice_type IN ('membership', 'service', 'renewal'));

-- Update comment
COMMENT ON COLUMN invoices.invoice_type IS 'Type of invoice: membership (initial signup), service (additional services), renewal (membership renewal)';
