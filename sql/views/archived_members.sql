-- View: archived_members
CREATE OR REPLACE VIEW public.archived_members AS
 SELECT am.email,
    am.role,
    am.name,
    am.deleted_at,
    mi.id AS member_info_id,
    mi.rank,
    mi.member_status,
    mi.profile_photo_url,
    mi.graduating_year,
    mi.major
   FROM allowed_members am
     LEFT JOIN member_info mi ON am.email = mi.user_email
  WHERE am.deleted_at IS NOT NULL
  ORDER BY am.deleted_at DESC;
