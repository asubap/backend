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
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY Only e-board can create events
    ON public.events
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (is_eboard(auth.email()))
;

CREATE POLICY Only e-board can delete events
    ON public.events
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING (is_eboard(auth.email()))
;

CREATE POLICY Only e-board can update events
    ON public.events
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING (is_eboard(auth.email()))
;

CREATE POLICY Public can view non-hidden events, auth users role-based
    ON public.events
    AS PERMISSIVE
    FOR SELECT
    TO {public}
    USING (((is_hidden = false) OR is_eboard(auth.email()) OR ((is_hidden = false) AND (auth.role() = 'authenticated'::text))))
;
