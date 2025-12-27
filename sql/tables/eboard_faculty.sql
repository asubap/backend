-- Table: eboard_faculty
CREATE TABLE IF NOT EXISTS public.eboard_faculty (
    role TEXT,
    email TEXT,
    role_email TEXT,
    profile_photo_url TEXT,
    name TEXT,
    major TEXT,
    rank INTEGER
);

-- Triggers

CREATE OR REPLACE FUNCTION public.sync_eboard_faculty_with_member_info()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  mi record;
begin
  -- Only handle INSERT and UPDATE (nothing to do on DELETE)
  if tg_op = 'DELETE' then
    return old;
  end if;

  -- Fetch corresponding member_info
  select name, major, profile_photo_url
  into mi
  from public.member_info
  where user_email = new.email;

  -- Proceed only if a matching member_info was found
  if mi is not null then
    -- Only update if values differ
    if (new.name is distinct from mi.name)
        or (new.major is distinct from mi.major)
        or (new.profile_photo_url is distinct from mi.profile_photo_url) then

      update public.eboard_faculty
      set name = mi.name,
          major = mi.major,
          profile_photo_url = mi.profile_photo_url
      where email = new.email;
    end if;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_eboard_faculty_info_on_email_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  update public.eboard_faculty
  set name = mi.name,
      major = mi.major,
      profile_photo_url = mi.profile_photo_url
  from public.member_info mi
  where mi.user_email = new.email
    and eboard_faculty.email = new.email;

  return new;
end;
$function$
;

CREATE TRIGGER trg_sync_eboard_faculty AFTER INSERT OR DELETE OR UPDATE ON public.eboard_faculty FOR EACH ROW EXECUTE FUNCTION sync_eboard_faculty_with_member_info();

CREATE TRIGGER trg_update_eboard_faculty_info AFTER UPDATE OF email ON public.eboard_faculty FOR EACH ROW EXECUTE FUNCTION update_eboard_faculty_info_on_email_update();

-- Row Level Security
ALTER TABLE public.eboard_faculty ENABLE ROW LEVEL SECURITY;

CREATE POLICY Anyone can read eboard faculty
    ON public.eboard_faculty
    AS PERMISSIVE
    FOR SELECT
    TO {public}
    USING (true)
;

CREATE POLICY Only e-board can delete eboard faculty
    ON public.eboard_faculty
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING (is_eboard(auth.email()))
;

CREATE POLICY Only e-board can insert eboard faculty
    ON public.eboard_faculty
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (is_eboard(auth.email()))
;

CREATE POLICY Only e-board can update eboard faculty
    ON public.eboard_faculty
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING (is_eboard(auth.email()))
;
