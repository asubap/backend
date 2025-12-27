-- Table: roles
CREATE TABLE IF NOT EXISTS public.roles (
    id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    role_name TEXT,
    PRIMARY KEY (id)
);

-- Indexes

CREATE UNIQUE INDEX roles_role_name_key ON public.roles USING btree (role_name);
