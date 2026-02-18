-- Table: events_arrays_backup
CREATE TABLE IF NOT EXISTS public.events_arrays_backup (
    id BIGINT,
    event_name TEXT,
    event_date DATE,
    event_rsvped ARRAY,
    event_attending ARRAY
);

-- Row Level Security
ALTER TABLE public.events_arrays_backup ENABLE ROW LEVEL SECURITY;

CREATE POLICY Only e-board can access backup
    ON public.events_arrays_backup
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING (is_eboard(auth.email()))
;
