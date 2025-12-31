-- View: categories_with_resources
CREATE OR REPLACE VIEW public.categories_with_resources AS
 SELECT c.id,
    c.name,
    c.description,
    c.created_at,
    c.resource_type,
    COALESCE(json_agg(json_build_object('id', r.id, 'name', r.name, 'description', r.description, 'file_key', r.file_key, 'mime_type', r.mime_type, 'created_at', r.created_at) ORDER BY r.name) FILTER (WHERE r.id IS NOT NULL), '[]'::json) AS resources
   FROM categories c
     LEFT JOIN resources r ON c.id = r.category_id
  GROUP BY c.id, c.name, c.description, c.created_at, c.resource_type
  ORDER BY c.name;
