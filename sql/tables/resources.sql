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

CREATE POLICY Anyone can read resources
    ON public.resources
    AS PERMISSIVE
    FOR SELECT
    TO {public}
    USING (true)
;

CREATE POLICY E-board and sponsors can delete resources
    ON public.resources
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING ((is_eboard(auth.email()) OR (EXISTS ( SELECT 1
   FROM (categories c
     JOIN allowed_members am ON (((lower(replace(c.name, ' '::text, '-'::text)) || '@example.com'::text) = am.email)))
  WHERE ((c.id = resources.category_id) AND (am.email = auth.email()) AND (am.role = 'sponsor'::text))))))
;

CREATE POLICY E-board and sponsors can insert resources
    ON public.resources
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK ((is_eboard(auth.email()) OR (EXISTS ( SELECT 1
   FROM (categories c
     JOIN allowed_members am ON (((lower(replace(c.name, ' '::text, '-'::text)) || '@example.com'::text) = am.email)))
  WHERE ((c.id = resources.category_id) AND (am.email = auth.email()) AND (am.role = 'sponsor'::text))))))
;

CREATE POLICY Only e-board can update resources
    ON public.resources
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING (is_eboard(auth.email()))
;
