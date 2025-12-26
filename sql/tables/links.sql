-- Table: links
CREATE TABLE IF NOT EXISTS public.links (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    link_name TEXT NOT NULL,
    link TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (id)
);
