-- Table: roles
CREATE TABLE IF NOT EXISTS public.roles (
    id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    role_name TEXT,
    PRIMARY KEY (id)
);

-- Indexes

CREATE UNIQUE INDEX roles_role_name_key ON public.roles USING btree (role_name);

-- Row Level Security

CREATE POLICY Anyone can read roles
    ON public.roles
    AS PERMISSIVE
    FOR SELECT
    TO {public}
    USING (true)
;

CREATE POLICY Only e-board can modify roles
    ON public.roles
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING (is_eboard(auth.email()))
;
