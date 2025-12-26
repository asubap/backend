-- Table: announcements
CREATE TABLE IF NOT EXISTS public.announcements (
    id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    title TEXT,
    description TEXT,
    PRIMARY KEY (id)
);

-- Row Level Security

CREATE POLICY Enable insert for authenticated users only
    ON public.announcements
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (true)
;

CREATE POLICY Enable read access for all users
    ON public.announcements
    AS PERMISSIVE
    FOR SELECT
    TO {public}
    USING (true)
;
