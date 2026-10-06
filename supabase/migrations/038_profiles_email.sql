-- BuildNerve: expose organisation members' email addresses.
-- Additive only: a new nullable profiles.email, backfilled from auth.users, and the
-- new-user trigger updated to keep it populated. No existing column, RPC or policy is
-- modified. Team & roles reads this to show member emails.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Backfill existing profiles from auth.users.
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id
  AND (p.email IS NULL OR p.email = '');

-- Keep profiles.email populated for future sign-ups.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email,
    now(),
    now()
  );
  RETURN NEW;
END;
$$;