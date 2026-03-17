-- Add notification preferences to profiles
ALTER TABLE public.profiles
ADD COLUMN notify_lesson_reminder boolean NOT NULL DEFAULT true,
ADD COLUMN notify_new_message boolean NOT NULL DEFAULT true,
ADD COLUMN notify_lesson_cancelled boolean NOT NULL DEFAULT true,
ADD COLUMN theme text NOT NULL DEFAULT 'dark';

-- Update handle_new_user to include defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, grade_level, birth_year, school_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    NEW.raw_user_meta_data ->> 'grade_level',
    (NEW.raw_user_meta_data ->> 'birth_year')::integer,
    NEW.raw_user_meta_data ->> 'school_type'
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'student')
  );
  RETURN NEW;
END;
$$;