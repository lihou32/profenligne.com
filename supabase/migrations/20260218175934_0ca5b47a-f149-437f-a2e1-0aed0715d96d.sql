
-- Allow admins to view all profiles (for user count stats)
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all tutor earnings (for revenue stats)
CREATE POLICY "Admins can view all earnings"
  ON public.tutor_earnings FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
