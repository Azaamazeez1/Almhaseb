-- ====================================================================
-- SUPABASE DATABASE SCHEMA FOR AL-AZIZ ACCOUNTING (العزيز للمحاسبة)
-- Copy and execute this SQL query in your Supabase SQL Editor.
-- ====================================================================

-- 1. Enable UUID Extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE USER ACCOUNTS TABLE
DROP TABLE IF EXISTS public.user_accounts CASCADE;
CREATE TABLE public.user_accounts (
    email TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    country_region TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for user_accounts
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read/write for user accounts" ON public.user_accounts;
CREATE POLICY "Allow public read/write for user accounts" ON public.user_accounts
    FOR ALL USING (true) WITH CHECK (true);

-- 3. CREATE INVENTORY ITEMS TABLE (With composite PRIMARY KEY to prevent conflicts between different users)
DROP TABLE IF EXISTS public.inventory_items CASCADE;
CREATE TABLE public.inventory_items (
    id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    cost NUMERIC NOT NULL DEFAULT 0,
    quantity NUMERIC NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (id, user_email)
);

-- Enable RLS for inventory_items
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read/write for items" ON public.inventory_items;
CREATE POLICY "Allow public read/write for items" ON public.inventory_items
    FOR ALL USING (true) WITH CHECK (true);

-- 4. CREATE CUSTOMERS & SUPPLIERS TABLE (With composite PRIMARY KEY to prevent conflicts between different users)
DROP TABLE IF EXISTS public.parties CASCADE;
CREATE TABLE public.parties (
    id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'customer' or 'supplier'
    phone TEXT,
    email TEXT,
    address TEXT,
    balance NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (id, user_email)
);

-- Enable RLS for parties
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read/write for parties" ON public.parties;
CREATE POLICY "Allow public read/write for parties" ON public.parties
    FOR ALL USING (true) WITH CHECK (true);

-- 5. CREATE TRANSACTIONS TABLE (With composite PRIMARY KEY to prevent conflicts between different users)
DROP TABLE IF EXISTS public.transactions CASCADE;
CREATE TABLE public.transactions (
    id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    type TEXT NOT NULL, -- 'sale', 'purchase', 'receipt_voucher', 'payment_voucher', 'initial_balance', etc.
    invoice_number TEXT,
    date TEXT NOT NULL,
    party_id TEXT,
    party_name TEXT,
    amount NUMERIC NOT NULL DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    cash_paid NUMERIC DEFAULT 0,
    notes TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (id, user_email)
);

-- Enable RLS for transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read/write for transactions" ON public.transactions;
CREATE POLICY "Allow public read/write for transactions" ON public.transactions
    FOR ALL USING (true) WITH CHECK (true);


-- 6. AUTOMATIC TRIGGER FOR PROFILE CREATION ON SIGN-UP
-- This automatically transfers user registration info from Supabase Auth to public.user_accounts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_accounts (email, full_name, company_name, country_region, phone)
  VALUES (
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'company_name', 'مؤسسة جديدة'),
    COALESCE(new.raw_user_meta_data->>'country_region', 'غير محدد'),
    COALESCE(new.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    company_name = EXCLUDED.company_name,
    country_region = EXCLUDED.country_region,
    phone = EXCLUDED.phone;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
