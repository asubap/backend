-- Table: links
CREATE TABLE IF NOT EXISTS public.links (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    link_name TEXT NOT NULL,
    link TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (id)
);

-- Row Level Security

CREATE POLICY Anyone can read links
    ON public.links
    AS PERMISSIVE
    FOR SELECT
    TO {public}
    USING (true)
;

CREATE POLICY Only e-board can delete links
    ON public.links
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING (is_eboard(auth.email()))
;

CREATE POLICY Only e-board can insert links
    ON public.links
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (is_eboard(auth.email()))
;

CREATE POLICY Only e-board can update links
    ON public.links
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING (is_eboard(auth.email()))
;
