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

CREATE POLICY Enable insert for authenticated users only
    ON public.sponsor_info
    AS PERMISSIVE
    FOR INSERT
    TO {public}
    WITH CHECK (true)
;

CREATE POLICY Enable read access for all users
    ON public.sponsor_info
    AS PERMISSIVE
    FOR SELECT
    TO {public}
    USING (true)
;
