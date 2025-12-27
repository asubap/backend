-- Table: categories
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    resource_type resource_type,
    PRIMARY KEY (id)
);

-- Indexes

CREATE UNIQUE INDEX categories_name_idx ON public.categories USING btree (lower(name));

-- Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY Anyone can read categories
    ON public.categories
    AS PERMISSIVE
    FOR SELECT
    TO {public}
    USING (true)
;

CREATE POLICY Authenticated users can create categories
    ON public.categories
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (true)
;

CREATE POLICY Authenticated users can delete categories
    ON public.categories
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING (true)
;

CREATE POLICY Authenticated users can update categories
    ON public.categories
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING (true)
;
