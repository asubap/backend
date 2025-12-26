-- Table: resources
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    category_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    file_key TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    blob_url TEXT,
    PRIMARY KEY (id)
);

ALTER TABLE public.resources
    ADD FOREIGN KEY (category_id)
    REFERENCES public.categories(id);

-- Indexes

CREATE INDEX resources_category_idx ON public.resources USING btree (category_id);

-- Row Level Security

CREATE POLICY Allow_inserts
    ON public.resources
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK ((auth.role() = 'authenticated'::text))
;
