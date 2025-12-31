-- View: events_with_attendance
CREATE OR REPLACE VIEW public.events_with_attendance AS
 SELECT e.id,
    e.event_name,
    e.event_description,
    e.event_location,
    e.event_lat,
    e.event_long,
    e.event_date,
    e.event_time,
    e.event_hours,
    e.event_hours_type,
    e.sponsors_attending,
    e.check_in_window,
    e.event_limit,
    e.check_in_radius,
    e.is_hidden,
    COALESCE(json_agg(json_build_object('status', ea.status, 'member_id', ea.member_id, 'member_info', json_build_object('user_email', mi.user_email, 'name', mi.name, 'user_id', mi.user_id)) ORDER BY mi.name) FILTER (WHERE ea.id IS NOT NULL), '[]'::json) AS event_attendance
   FROM events e
     LEFT JOIN event_attendance ea ON e.id = ea.event_id
     LEFT JOIN member_info mi ON ea.member_id = mi.id
  GROUP BY e.id, e.event_name, e.event_description, e.event_location, e.event_lat, e.event_long, e.event_date, e.event_time, e.event_hours, e.event_hours_type, e.sponsors_attending, e.check_in_window, e.event_limit, e.check_in_radius, e.is_hidden;
