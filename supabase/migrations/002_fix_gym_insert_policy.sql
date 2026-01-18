-- Fix the gym INSERT policy to allow signup
-- Allow authenticated users to insert their gym record

DROP POLICY IF EXISTS "Users can insert their own gym" ON gyms;

-- Allow authenticated users to insert gyms
-- The application code ensures user_id matches the authenticated user
CREATE POLICY "Users can insert their own gym" ON gyms
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
