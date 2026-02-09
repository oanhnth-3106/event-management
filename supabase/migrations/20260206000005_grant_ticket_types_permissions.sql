-- =====================================================================
-- Migration: Grant UPDATE and DELETE permissions on ticket_types
-- =====================================================================

-- Grant UPDATE and DELETE permissions to anon and authenticated roles
GRANT UPDATE ON ticket_types TO anon, authenticated;
GRANT DELETE ON ticket_types TO anon, authenticated;

-- Also grant INSERT if not already granted (for adding ticket types)
GRANT INSERT ON ticket_types TO anon, authenticated;

-- Verify permissions
SELECT 
    grantee, 
    table_name, 
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name = 'ticket_types'
AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;
