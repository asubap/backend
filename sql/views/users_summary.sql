-- View: users_summary
CREATE OR REPLACE VIEW public.users_summary AS
 SELECT am.email,
    am.role,
    COALESCE(mi.name, ''::text) AS name,
    mi.rank
   FROM allowed_members am
     LEFT JOIN member_info mi ON am.email = mi.user_email
  WHERE am.deleted_at IS NULL
  ORDER BY am.role DESC;
