-- Table: events
CREATE TABLE IF NOT EXISTS public.events (
    id BIGINT NOT NULL,
    event_name TEXT NOT NULL,
    event_description TEXT,
    event_location TEXT,
    event_lat NUMERIC,
    event_long NUMERIC,
    event_date DATE,
    event_time TIME WITHOUT TIME ZONE,
    event_hours NUMERIC,
    event_hours_type TEXT,
    sponsors_attending ARRAY,
    check_in_window NUMERIC,
    event_limit NUMERIC,
    check_in_radius NUMERIC NOT NULL,
    is_hidden BOOLEAN DEFAULT false,
    PRIMARY KEY (id)
);

-- Indexes

CREATE INDEX idx_events_hours ON public.events USING btree (id, event_hours_type, event_hours);

-- Row Level Security

CREATE POLICY Enable insert for authenticated users only
    ON public.events
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (true)
;

CREATE POLICY Enable read access for all users
    ON public.events
    AS PERMISSIVE
    FOR SELECT
    TO {public}
    USING (true)
;

CREATE POLICY delete for e-board
    ON public.events
    AS PERMISSIVE
    FOR DELETE
    TO {public}
    USING ((EXISTS ( SELECT 1
   FROM allowed_members am
  WHERE ((am.email = auth.email()) AND (am.role = 'e-board'::text)))))
;

CREATE POLICY e-board insert
    ON public.events
    AS PERMISSIVE
    FOR INSERT
    TO {public}
    WITH CHECK ((EXISTS ( SELECT 1
   FROM allowed_members am
  WHERE ((am.email = auth.email()) AND (am.role = 'e-board'::text)))))
;

CREATE POLICY update for e-board
    ON public.events
    AS PERMISSIVE
    FOR SELECT
    TO {public}
    USING ((EXISTS ( SELECT 1
   FROM allowed_members am
  WHERE ((am.email = auth.email()) AND (am.role = 'e-board'::text)))))
;
