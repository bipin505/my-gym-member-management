-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Gyms table
CREATE TABLE gyms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#1E40AF',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Members table
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('Monthly', 'Quarterly', 'Yearly')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_status TEXT DEFAULT 'Paid' CHECK (payment_status IN ('Paid', 'Pending', 'Overdue')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services table
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  base_price DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Member Services table
CREATE TABLE member_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_members_gym_id ON members(gym_id);
CREATE INDEX idx_members_end_date ON members(end_date);
CREATE INDEX idx_invoices_gym_id ON invoices(gym_id);
CREATE INDEX idx_invoices_member_id ON invoices(member_id);
CREATE INDEX idx_services_gym_id ON services(gym_id);
CREATE INDEX idx_member_services_member_id ON member_services(member_id);
CREATE INDEX idx_member_services_service_id ON member_services(service_id);

-- Row Level Security (RLS) Policies
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_services ENABLE ROW LEVEL SECURITY;

-- Gyms policies
CREATE POLICY "Users can view their own gym" ON gyms
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own gym" ON gyms
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gym" ON gyms
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Members policies
CREATE POLICY "Gym owners can view their members" ON members
  FOR SELECT USING (
    gym_id IN (SELECT id FROM gyms WHERE user_id = auth.uid())
  );

CREATE POLICY "Gym owners can insert members" ON members
  FOR INSERT WITH CHECK (
    gym_id IN (SELECT id FROM gyms WHERE user_id = auth.uid())
  );

CREATE POLICY "Gym owners can update their members" ON members
  FOR UPDATE USING (
    gym_id IN (SELECT id FROM gyms WHERE user_id = auth.uid())
  );

CREATE POLICY "Gym owners can delete their members" ON members
  FOR DELETE USING (
    gym_id IN (SELECT id FROM gyms WHERE user_id = auth.uid())
  );

-- Invoices policies
CREATE POLICY "Gym owners can view their invoices" ON invoices
  FOR SELECT USING (
    gym_id IN (SELECT id FROM gyms WHERE user_id = auth.uid())
  );

CREATE POLICY "Gym owners can insert invoices" ON invoices
  FOR INSERT WITH CHECK (
    gym_id IN (SELECT id FROM gyms WHERE user_id = auth.uid())
  );

CREATE POLICY "Gym owners can update their invoices" ON invoices
  FOR UPDATE USING (
    gym_id IN (SELECT id FROM gyms WHERE user_id = auth.uid())
  );

CREATE POLICY "Gym owners can delete their invoices" ON invoices
  FOR DELETE USING (
    gym_id IN (SELECT id FROM gyms WHERE user_id = auth.uid())
  );

-- Services policies
CREATE POLICY "Gym owners can view their services" ON services
  FOR SELECT USING (
    gym_id IN (SELECT id FROM gyms WHERE user_id = auth.uid())
  );

CREATE POLICY "Gym owners can insert services" ON services
  FOR INSERT WITH CHECK (
    gym_id IN (SELECT id FROM gyms WHERE user_id = auth.uid())
  );

CREATE POLICY "Gym owners can update their services" ON services
  FOR UPDATE USING (
    gym_id IN (SELECT id FROM gyms WHERE user_id = auth.uid())
  );

CREATE POLICY "Gym owners can delete their services" ON services
  FOR DELETE USING (
    gym_id IN (SELECT id FROM gyms WHERE user_id = auth.uid())
  );

-- Member Services policies
CREATE POLICY "Gym owners can view member services" ON member_services
  FOR SELECT USING (
    member_id IN (
      SELECT id FROM members WHERE gym_id IN (
        SELECT id FROM gyms WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Gym owners can insert member services" ON member_services
  FOR INSERT WITH CHECK (
    member_id IN (
      SELECT id FROM members WHERE gym_id IN (
        SELECT id FROM gyms WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Gym owners can update member services" ON member_services
  FOR UPDATE USING (
    member_id IN (
      SELECT id FROM members WHERE gym_id IN (
        SELECT id FROM gyms WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Gym owners can delete member services" ON member_services
  FOR DELETE USING (
    member_id IN (
      SELECT id FROM members WHERE gym_id IN (
        SELECT id FROM gyms WHERE user_id = auth.uid()
      )
    )
  );

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
BEGIN
  SELECT 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('invoice_seq')::TEXT, 4, '0')
  INTO new_number;
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for invoice numbers
CREATE SEQUENCE invoice_seq START 1;

-- Storage bucket for gym logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('gym-logos', 'gym-logos', true)
ON CONFLICT DO NOTHING;

-- Storage policies for gym logos
CREATE POLICY "Gym owners can upload logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'gym-logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'gym-logos');

CREATE POLICY "Gym owners can update their logos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'gym-logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Gym owners can delete their logos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'gym-logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
