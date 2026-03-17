-- Allow admins to update tutor records (status, etc.)
CREATE POLICY "Admins can update tutors"
ON public.tutors
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));