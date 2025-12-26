-- View: member_hours_summary
-- Updated: Added am.role to optimize /member-info/active/summary endpoint
CREATE OR REPLACE VIEW public.member_hours_summary AS
 SELECT mi.id,
    mi.user_id,
    mi.user_email,
    mi.name,
    mi.major,
    mi.graduating_year,
    mi.rank,
    mi.member_status,
    mi.profile_photo_url,
    mi.about,
    mi.phone,
    mi.links,
    COALESCE(sum(e.event_hours) FILTER (WHERE e.event_hours_type = 'development'::text), 0::numeric) AS development_hours,
    COALESCE(sum(e.event_hours) FILTER (WHERE e.event_hours_type = 'professional'::text), 0::numeric) AS professional_hours,
    COALESCE(sum(e.event_hours) FILTER (WHERE e.event_hours_type = 'service'::text), 0::numeric) AS service_hours,
    COALESCE(sum(e.event_hours) FILTER (WHERE e.event_hours_type = 'social'::text), 0::numeric) AS social_hours,
    COALESCE(sum(e.event_hours), 0::numeric) AS total_hours,
    count(e.id) AS events_attended,
    am.role
   FROM member_info mi
     JOIN allowed_members am ON mi.user_email = am.email
     LEFT JOIN event_attendance ea ON mi.id = ea.member_id AND ea.status = 'attended'::text
     LEFT JOIN events e ON ea.event_id = e.id AND e.event_hours_type IS DISTINCT FROM 'n/a'::text
  WHERE am.deleted_at IS NULL
  GROUP BY mi.id, mi.user_id, mi.user_email, mi.name, mi.major, mi.graduating_year, mi.rank, mi.member_status, mi.profile_photo_url, mi.about, mi.phone, mi.links, am.role;
