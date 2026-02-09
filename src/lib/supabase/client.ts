// =====================================================================
// Supabase Client - Browser/Client Component
// =====================================================================
// Purpose: Client-side Supabase client for interactive components
// Usage: Client Components (marked with "use client")
// =====================================================================

import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database.types';

/**
 * Creates a Supabase client for Client Components
 * 
 * This client:
 * - Runs in the browser
 * - Inherits the user's session from cookies
 * - Row-Level Security (RLS) is ENFORCED
 * - Use for interactive features (forms, real-time subscriptions)
 * - Automatically handles session refresh
 * 
 * @example
 * // In a Client Component
 * "use client";
 * 
 * function EventList() {
 *   const supabase = createBrowserClient();
 *   const [events, setEvents] = useState([]);
 * 
 *   useEffect(() => {
 *     supabase.from('events')
 *       .select('*')
 *       .then(({ data }) => setEvents(data));
 *   }, []);
 * }
 */
export function createBrowserClient() {
  return createSupabaseBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
