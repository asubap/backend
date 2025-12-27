-- Table: sponsor_info
CREATE TABLE IF NOT EXISTS public.sponsor_info (
    resources ARRAY,
    company_name TEXT,
    about TEXT,
    links ARRAY,
    pfp_url TEXT,
    id BIGINT NOT NULL,
    emails ARRAY,
    uuid UUID,
    tier TEXT,
    PRIMARY KEY (id)
);

-- Indexes

CREATE UNIQUE INDEX sponsor_info_company_name_key ON public.sponsor_info USING btree (company_name);

-- Row Level Security
ALTER TABLE public.sponsor_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY Anyone can read sponsor info
    ON public.sponsor_info
    AS PERMISSIVE
    FOR SELECT
    TO {public}
    USING (true)
;

CREATE POLICY Only e-board can delete sponsors
    ON public.sponsor_info
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING (is_eboard(auth.email()))
;

CREATE POLICY Only e-board can insert sponsors
    ON public.sponsor_info
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (is_eboard(auth.email()))
;

CREATE POLICY Sponsors can update own info, e-board can update all
    ON public.sponsor_info
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING ((((lower(replace(company_name, ' '::text, '-'::text)) || '@example.com'::text) = auth.email()) OR is_eboard(auth.email())))
;
