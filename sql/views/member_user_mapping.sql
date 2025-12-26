-- View: member_user_mapping
CREATE OR REPLACE VIEW public.member_user_mapping AS
 SELECT mi.id,
    mi.name,
    mi.user_email,
    au.id AS user_id
   FROM member_info mi
     JOIN allowed_members am ON mi.user_email = am.email
     LEFT JOIN auth.users au ON mi.user_email = au.email::text
  WHERE am.deleted_at IS NULL;
