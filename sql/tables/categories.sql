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
