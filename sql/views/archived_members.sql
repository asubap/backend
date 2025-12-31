-- View: archived_members
CREATE OR REPLACE VIEW public.archived_members AS
 SELECT allowed_members.email,
    allowed_members.role,
    allowed_members.deleted_at,
    allowed_members.name
   FROM allowed_members
  WHERE allowed_members.deleted_at IS NOT NULL
  ORDER BY allowed_members.deleted_at DESC;
