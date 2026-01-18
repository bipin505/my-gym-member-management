-- Add date of birth field to members table for birthday tracking
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS dob DATE;

-- Add comment to explain the field
COMMENT ON COLUMN members.dob IS 'Date of birth for birthday tracking and member management';
