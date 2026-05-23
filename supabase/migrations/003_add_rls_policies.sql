-- Row Level Security policies for FlowTab.
-- Run this after 002_link_profiles_to_auth.sql.

-- Enable RLS on all user-owned tables.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- PROFILES
-- Users can read their own profile row.
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Users can update their own profile row.
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Allow profile creation for the signed-in user if needed.
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- CATEGORIES
-- Users can read only their own categories.
DROP POLICY IF EXISTS "categories_select_own" ON public.categories;
CREATE POLICY "categories_select_own"
ON public.categories
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can create categories for themselves only.
DROP POLICY IF EXISTS "categories_insert_own" ON public.categories;
CREATE POLICY "categories_insert_own"
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update only their own categories.
DROP POLICY IF EXISTS "categories_update_own" ON public.categories;
CREATE POLICY "categories_update_own"
ON public.categories
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete only their own categories.
DROP POLICY IF EXISTS "categories_delete_own" ON public.categories;
CREATE POLICY "categories_delete_own"
ON public.categories
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- TRANSACTIONS
-- Users can read only their own transactions.
DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;
CREATE POLICY "transactions_select_own"
ON public.transactions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can create transactions for themselves only.
DROP POLICY IF EXISTS "transactions_insert_own" ON public.transactions;
CREATE POLICY "transactions_insert_own"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update only their own transactions.
DROP POLICY IF EXISTS "transactions_update_own" ON public.transactions;
CREATE POLICY "transactions_update_own"
ON public.transactions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete only their own transactions.
DROP POLICY IF EXISTS "transactions_delete_own" ON public.transactions;
CREATE POLICY "transactions_delete_own"
ON public.transactions
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
