// =====================================================================
// Supabase Service Client - Command Layer
// =====================================================================
// Purpose: Server-side client with service role (RLS BYPASSED)
// Usage: Command layer, background jobs, admin operations
// Security: NEVER expose to client, implement authorization manually
// =====================================================================

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/**
 * Creates a Supabase client with service role privileges
 * 
 * ⚠️ SECURITY WARNING:
 * - This client BYPASSES Row-Level Security (RLS)
 * - Can read/write ANY data in the database
 * - MUST implement authorization checks manually
 * - NEVER use in Client Components
 * - NEVER expose service role key to client
 * 
 * Use cases:
 * - Command layer (business logic with cross-user operations)
 * - Background jobs (email reminders, event completion)
 * - Admin operations (elevate user roles)
 * - Transactions requiring atomicity across tables
 * 
 * @example
 * // In a command handler
 * export async function registerForEvent(input: RegisterInput) {
 *   const supabase = createServiceClient();
 *   
 *   // Manual authorization check
 *   if (!isUserAllowed(input.userId)) {
 *     throw new Error('Unauthorized');
 *   }
 *   
 *   // Business logic with transaction
 *   const { data, error } = await supabase.rpc('register_for_event', {
 *     p_event_id: input.eventId,
 *     p_user_id: input.userId,
 *     p_ticket_type_id: input.ticketTypeId
 *   });
 * }
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
    );
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Executes a database operation within a transaction
 * 
 * Note: Supabase doesn't directly support transactions in the client library.
 * Use PostgreSQL functions (RPC) for complex transactions.
 * 
 * @example
 * // Create a stored procedure in PostgreSQL:
 * CREATE OR REPLACE FUNCTION register_for_event(...)
 * RETURNS json AS $$
 * BEGIN
 *   -- All operations in single transaction
 *   -- Automatically rolled back on error
 * END;
 * $$ LANGUAGE plpgsql;
 * 
 * // Call from TypeScript:
 * const result = await executeTransaction(
 *   'register_for_event',
 *   { p_event_id: '...', p_user_id: '...' }
 * );
 */
export async function executeTransaction<T = unknown>(
  functionName: string,
  params: Record<string, unknown>
): Promise<{ data: T | null; error: Error | null }> {
  const supabase = createServiceClient();
  
  // @ts-ignore - Supabase RPC type inference issue
  const { data, error } = await supabase.rpc(functionName, params);
  
  if (error) {
    return { data: null, error: new Error(error.message) };
  }
  
  return { data: data as T, error: null };
}
