-- Table: announcements
CREATE TABLE IF NOT EXISTS public.announcements (
    id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    title TEXT,
    description TEXT,
    PRIMARY KEY (id)
);

-- Row Level Security
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY Authenticated users can read announcements
    ON public.announcements
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING (true)
;

CREATE POLICY Only e-board can create announcements
    ON public.announcements
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (is_eboard(auth.email()))
;

CREATE POLICY Only e-board can delete announcements
    ON public.announcements
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING (is_eboard(auth.email()))
;

CREATE POLICY Only e-board can update announcements
    ON public.announcements
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING (is_eboard(auth.email()))
;
