-- Add new profile fields for students
ALTER TABLE public.profiles
ADD COLUMN grade_level text,
ADD COLUMN birth_year integer,
ADD COLUMN school_type text;

-- Update the handle_new_user function to store these fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;