-- View: users_summary
-- Purpose: Optimized view for /users/summary endpoint
-- Combines allowed_members and member_info tables to avoid N+1 queries

CREATE OR REPLACE VIEW public.users_summary AS
SELECT
    am.email,
    am.role,
    COALESCE(mi.name, '') as name,
    mi.rank
FROM allowed_members am
LEFT JOIN member_info mi ON am.email = mi.user_email
WHERE am.deleted_at IS NULL
ORDER BY am.role DESC;
