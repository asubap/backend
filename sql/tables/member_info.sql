-- Table: member_info
CREATE TABLE IF NOT EXISTS public.member_info (
    id BIGINT NOT NULL,
    user_email TEXT DEFAULT ''::text NOT NULL,
    links ARRAY,
    name TEXT,
    major TEXT,
    about TEXT,
    graduating_year NUMERIC,
    profile_photo_url VARCHAR,
    rank rank NOT NULL,
    member_status TEXT,
    phone TEXT,
    user_id UUID,
    PRIMARY KEY (id)
);

ALTER TABLE public.member_info
    ADD FOREIGN KEY (user_email)
    REFERENCES public.allowed_members(email);

-- Triggers

CREATE OR REPLACE FUNCTION public.update_allowed_member_name_on_member_info_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only update if name is changed and not null
  IF NEW.name IS NOT NULL AND (OLD.name IS NULL OR OLD.name <> NEW.name) THEN
    UPDATE allowed_members
    SET name = NEW.name
    WHERE email = NEW.user_email;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE TRIGGER update_allowed_member_name_trigger AFTER UPDATE OF name ON public.member_info FOR EACH ROW EXECUTE FUNCTION update_allowed_member_name_on_member_info_update();

-- Indexes

CREATE INDEX idx_member_info_user_id ON public.member_info USING btree (user_id);

CREATE UNIQUE INDEX member_info_user_email_key ON public.member_info USING btree (user_email);

CREATE UNIQUE INDEX member_info_user_id_unique ON public.member_info USING btree (user_id);

-- Row Level Security

CREATE POLICY Allow user or e-board to update member_info
    ON public.member_info
    AS PERMISSIVE
    FOR UPDATE
    TO {public}
    USING (((user_email = auth.email()) OR (EXISTS ( SELECT 1
   FROM allowed_members am
  WHERE ((am.email = auth.email()) AND (am.role = 'e-board'::text))))))
;

CREATE POLICY Enable read access for all users
    ON public.member_info
    AS PERMISSIVE
    FOR SELECT
    TO {public}
    USING (true)
;
