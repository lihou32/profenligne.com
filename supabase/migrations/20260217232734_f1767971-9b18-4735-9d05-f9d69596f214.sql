
-- Remove UPDATE policy on user_credits (credits should only be modified server-side)
DROP POLICY IF EXISTS "Users can update own credits" ON public.user_credits;

-- Remove INSERT policy on user_credits (credits should only be created server-side)
DROP POLICY IF EXISTS "Users can insert own credits" ON public.user_credits;

-- Remove INSERT policy on credit_transactions (transactions should only be logged server-side)
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.credit_transactions;
