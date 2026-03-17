
-- Table for pre-registration emails
CREATE TABLE public.preregistrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT preregistrations_email_unique UNIQUE (email)
);

-- Enable RLS
ALTER TABLE public.preregistrations ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public form, no auth needed)
CREATE POLICY "Anyone can pre-register"
ON public.preregistrations
FOR INSERT
TO anon
WITH CHECK (true);

-- Only admins can view pre-registrations
CREATE POLICY "Admins can view pre-registrations"
ON public.preregistrations
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
