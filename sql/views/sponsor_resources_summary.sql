-- View: sponsor_resources_summary
CREATE OR REPLACE VIEW public.sponsor_resources_summary AS
 SELECT si.id,
    si.company_name,
    si.about,
    si.links,
    si.pfp_url,
    si.tier,
    si.emails,
    si.uuid,
    COALESCE(json_agg(json_build_object('id', r.id, 'name', r.name, 'description', r.description, 'file_key', r.file_key, 'mime_type', r.mime_type, 'created_at', r.created_at) ORDER BY r.name) FILTER (WHERE r.id IS NOT NULL), '[]'::json) AS resources
   FROM sponsor_info si
     LEFT JOIN categories c ON si.company_name = c.name
     LEFT JOIN resources r ON c.id = r.category_id
  GROUP BY si.id, si.company_name, si.about, si.links, si.pfp_url, si.tier, si.emails, si.uuid
  ORDER BY si.company_name;
