-- ====================================================================
-- SUPABASE DATABASE SCHEMA FOR AL-AZIZ ACCOUNTING (العزيز للمحاسبة)
-- Copy and execute this SQL query in your Supabase SQL Editor.
-- ====================================================================

-- 1. Enable UUID Extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE USER ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.user_accounts (
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

-- 3. CREATE INVENTORY ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_email TEXT NOT NULL REFERENCES public.user_accounts(email) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    cost NUMERIC NOT NULL DEFAULT 0,
    quantity NUMERIC NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for inventory_items
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read/write for items" ON public.inventory_items;
CREATE POLICY "Allow public read/write for items" ON public.inventory_items
    FOR ALL USING (true) WITH CHECK (true);

-- 4. CREATE CUSTOMERS & SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS public.parties (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_email TEXT NOT NULL REFERENCES public.user_accounts(email) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'customer' or 'supplier'
    phone TEXT,
    email TEXT,
    address TEXT,
    balance NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for parties
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read/write for parties" ON public.parties;
CREATE POLICY "Allow public read/write for parties" ON public.parties
    FOR ALL USING (true) WITH CHECK (true);

-- 5. CREATE TRANSACTIONS TABLE (Invoices & Vouchers)
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_email TEXT NOT NULL REFERENCES public.user_accounts(email) ON DELETE CASCADE,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read/write for transactions" ON public.transactions;
CREATE POLICY "Allow public read/write for transactions" ON public.transactions
    FOR ALL USING (true) WITH CHECK (true);
