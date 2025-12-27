-- Table: allowed_members
CREATE TABLE IF NOT EXISTS public.allowed_members (
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    name TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (email)
);

ALTER TABLE public.allowed_members
    ADD FOREIGN KEY (role)
    REFERENCES public.roles(role_name);

-- Triggers

CREATE OR REPLACE FUNCTION public.create_member_info_on_allowed_member_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
v_user_id UUID;
BEGIN
-- Only create member_info for actual members, NOT sponsors
IF NEW.role IN ('general-member','pledge') THEN
    -- Get the user_id from auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = NEW.email;

    -- Insert into member_info
    INSERT INTO public.member_info (
    user_email,
    rank,
    user_id,
    name,
    member_status
    )
    VALUES (
    NEW.email,
    'pledge',
    v_user_id,
    NEW.name,
    'Active'
    )
    ON CONFLICT (user_email) DO UPDATE
    SET
    name = COALESCE(EXCLUDED.name, member_info.name),
    user_id = COALESCE(EXCLUDED.user_id, member_info.user_id),
    rank = EXCLUDED.rank;
END IF;
RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_auth_user_by_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'auth', 'pg_temp'
AS $function$
BEGIN
-- Delete the user from auth.users by email
DELETE FROM auth.users WHERE email = OLD.email;
RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_member_info_on_allowed_member_delete()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  DELETE FROM public.member_info
   WHERE user_email = OLD.email;
  RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_sponsor_by_email_and_company()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
extracted_company_name TEXT;
BEGIN
-- Check if the deleted row is a sponsor
IF OLD.role = 'sponsor' THEN
    -- Extract company name from email
    extracted_company_name := LOWER(SPLIT_PART(OLD.email, '@', 1));

    -- Delete from sponsor_info
    DELETE FROM public.sponsor_info
    WHERE LOWER(company_name) = extracted_company_name;

    -- Delete the user from auth.users
    DELETE FROM auth.users
    WHERE email = OLD.email;
END IF;

RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_member_info_on_allowed_member_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
  BEGIN
    -- Ignore updates that ONLY change deleted_at (soft-delete metadata)
    IF (OLD.role IS NOT DISTINCT FROM NEW.role)
       AND (OLD.email IS NOT DISTINCT FROM NEW.email)
       AND (OLD.name IS NOT DISTINCT FROM NEW.name) THEN
      RETURN NEW;
    END IF;

    -- RESTORATION LOGIC: If user is being restored and member_info is missing, recreate it
    IF OLD.deleted_at IS NOT NULL
       AND NEW.deleted_at IS NULL
       AND NEW.role IN ('general-member', 'pledge') THEN

      -- Check if member_info exists
      IF NOT EXISTS (SELECT 1 FROM public.member_info WHERE user_email = NEW.email) THEN
        -- Recreate the profile
        INSERT INTO public.member_info (
          user_email,
          rank,
          name,
          user_id,
          member_status
        )
        VALUES (
          NEW.email,
          'pledge',
          NEW.name,
          (SELECT id FROM auth.users WHERE email = NEW.email),
          'Active'
        );
        RAISE NOTICE 'Recreated member_info for restored user %', NEW.email;
      END IF;

      RETURN NEW;
    END IF;

    -- Do NOT modify member_info for currently-archived users
    -- Their data must remain intact for restoration
    IF NEW.deleted_at IS NOT NULL THEN
      RETURN NEW;
    END IF;

    -- Original logic: role dropped out of member set?
    IF OLD.role IN ('general-member','pledge')
       AND NEW.role NOT IN ('general-member','pledge') THEN

      DELETE FROM public.member_info
       WHERE user_email = OLD.email;

    -- role newly became member/pledge?
    ELSIF NEW.role IN ('general-member','pledge')
          AND OLD.role NOT IN ('general-member','pledge') THEN

      INSERT INTO public.member_info (
        user_email,
        rank
      )
      VALUES (
        NEW.email,
        'current'
      )
      ON CONFLICT (user_email) DO NOTHING;

    END IF;

    RETURN NEW;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.handle_soft_delete_auth_ban()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
  DECLARE
    auth_user_exists BOOLEAN;
  BEGIN
    -- Check if auth user exists
    SELECT EXISTS(
      SELECT 1 FROM auth.users WHERE email = NEW.email
    ) INTO auth_user_exists;

    -- User being archived (deleted_at set)
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN

      IF auth_user_exists THEN
        -- Ban the user in Supabase Auth
        UPDATE auth.users
        SET banned_until = 'infinity'::timestamptz,
            updated_at = NOW()
        WHERE email = NEW.email;

        RAISE NOTICE 'User % has been banned', NEW.email;
      ELSE
        -- User never logged in, log warning but don't fail
        RAISE WARNING 'Cannot ban user % - no auth record exists', NEW.email;
      END IF;

    -- User being restored (deleted_at cleared)
    ELSIF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN

      IF auth_user_exists THEN
        -- Unban the user
        UPDATE auth.users
        SET banned_until = NULL,
            updated_at = NOW()
        WHERE email = NEW.email;

        RAISE NOTICE 'User % has been unbanned', NEW.email;
      ELSE
        RAISE WARNING 'Cannot unban user % - no auth record exists', NEW.email;
      END IF;

    END IF;

    RETURN NEW;
  END;
  $function$
;

CREATE TRIGGER add_member_info_on_allowed_member_insert AFTER INSERT ON public.allowed_members FOR EACH ROW EXECUTE FUNCTION create_member_info_on_allowed_member_insert();

CREATE TRIGGER delete_auth_user_trigger AFTER DELETE ON public.allowed_members FOR EACH ROW EXECUTE FUNCTION delete_auth_user_by_email();

CREATE TRIGGER delete_member_info_on_allowed_member_delete AFTER DELETE ON public.allowed_members FOR EACH ROW EXECUTE FUNCTION delete_member_info_on_allowed_member_delete();

CREATE TRIGGER delete_sponsor_trigger AFTER DELETE ON public.allowed_members FOR EACH ROW EXECUTE FUNCTION delete_sponsor_by_email_and_company();

CREATE TRIGGER sync_member_info_on_allowed_member_update AFTER UPDATE ON public.allowed_members FOR EACH ROW EXECUTE FUNCTION sync_member_info_on_allowed_member_update();

CREATE TRIGGER on_allowed_member_soft_delete AFTER UPDATE OF deleted_at ON public.allowed_members FOR EACH ROW EXECUTE FUNCTION handle_soft_delete_auth_ban();

-- Indexes

CREATE INDEX idx_allowed_members_active ON public.allowed_members USING btree (email) WHERE (deleted_at IS NULL);

CREATE INDEX idx_allowed_members_deleted ON public.allowed_members USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);

-- Row Level Security
ALTER TABLE public.allowed_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY Only e-board can delete members
    ON public.allowed_members
    AS PERMISSIVE
    FOR DELETE
    TO {public}
    USING (is_eboard(auth.email()))
;

CREATE POLICY Only e-board can insert members
    ON public.allowed_members
    AS PERMISSIVE
    FOR INSERT
    TO {public}
    WITH CHECK (is_eboard(auth.email()))
;

CREATE POLICY Only e-board can update members
    ON public.allowed_members
    AS PERMISSIVE
    FOR UPDATE
    TO {public}
    USING (is_eboard(auth.email()))
;

CREATE POLICY Users can read based on role and context
    ON public.allowed_members
    AS PERMISSIVE
    FOR SELECT
    TO {public}
    USING (((email = auth.email()) OR (deleted_at IS NULL) OR is_eboard(auth.email())))
;
