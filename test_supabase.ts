import { createClient } from '@supabase/supabase-js'; const client = createClient('u', 'k'); client.auth.admin;
