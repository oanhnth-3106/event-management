// =====================================================================
// Database Types - Auto-generated from Supabase Schema
// =====================================================================
// Version: 1.0
// Date: February 6, 2026
// Description: TypeScript types matching PostgreSQL schema exactly
// =====================================================================

/**
 * Enums matching PostgreSQL custom types
 */
export type UserRole = 'attendee' | 'organizer' | 'staff' | 'admin';

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';

export type RegistrationStatus = 'confirmed' | 'checked_in' | 'cancelled';

export type CheckInMethod = 'qr' | 'manual';

export type ReminderType = '24h' | '2h';

/**
 * Database table row types
 */
export interface Profile {
  id: string; // UUID
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  email_verified: boolean;
  reminder_opt_out: boolean;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

export interface Event {
  id: string; // UUID
  organizer_id: string; // UUID
  title: string;
  slug: string;
  description: string | null;
  start_date: string; // ISO 8601 timestamp
  end_date: string; // ISO 8601 timestamp
  location: string;
  capacity: number;
  image_url: string | null;
  status: EventStatus;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
  published_at: string | null; // ISO 8601 timestamp
  cancelled_at: string | null; // ISO 8601 timestamp
  completed_at: string | null; // ISO 8601 timestamp
}

export interface TicketType {
  id: string; // UUID
  event_id: string; // UUID
  name: string;
  description: string | null;
  price: number; // Decimal as number (e.g., 99.99)
  quantity: number;
  available: number;
  created_at: string; // ISO 8601 timestamp
}

export interface Registration {
  id: string; // UUID
  event_id: string; // UUID
  user_id: string; // UUID
  ticket_type_id: string; // UUID
  ticket_code: string; // UUID
  qr_data: string;
  status: RegistrationStatus;
  checked_in_at: string | null; // ISO 8601 timestamp
  checked_in_by: string | null; // UUID
  cancelled_at: string | null; // ISO 8601 timestamp
  metadata: Record<string, unknown> | null; // JSONB
  created_at: string; // ISO 8601 timestamp
}

export interface CheckIn {
  id: string; // UUID
  registration_id: string; // UUID
  staff_id: string; // UUID
  method: CheckInMethod;
  location: string | null;
  device_info: Record<string, unknown> | null; // JSONB
  timestamp: string; // ISO 8601 timestamp
}

export interface StaffAssignment {
  id: string; // UUID
  event_id: string; // UUID
  staff_id: string; // UUID
  assigned_by: string; // UUID
  role: string | null;
  created_at: string; // ISO 8601 timestamp
}

export interface EventReminder {
  id: string; // UUID
  event_id: string; // UUID
  reminder_type: ReminderType;
  recipient_count: number;
  sent_at: string; // ISO 8601 timestamp
  completed_at: string | null; // ISO 8601 timestamp
  failed_count: number;
}

/**
 * View types
 */
export interface EventStatistics {
  event_id: string;
  title: string;
  status: EventStatus;
  capacity: number;
  start_date: string;
  end_date: string;
  total_registrations: number;
  total_checked_in: number;
  awaiting_checkin: number;
  cancelled_registrations: number;
  available_capacity: number;
  capacity_percentage: number;
  checkin_percentage: number;
}

/**
 * Insert types (for creating new records)
 * Omits auto-generated fields like id, created_at, etc.
 */
export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'> & {
  id: string; // Required for linking to auth.users
};

export type EventInsert = Omit<
  Event,
  'id' | 'created_at' | 'updated_at' | 'published_at' | 'cancelled_at' | 'completed_at'
> & {
  id?: string; // Optional, defaults to uuid_generate_v4()
  published_at?: string | null;
  cancelled_at?: string | null;
  completed_at?: string | null;
};

export type TicketTypeInsert = Omit<TicketType, 'id' | 'created_at'> & {
  id?: string;
};

export type RegistrationInsert = Omit<
  Registration,
  'id' | 'created_at' | 'checked_in_at' | 'checked_in_by' | 'cancelled_at'
> & {
  id?: string;
  checked_in_at?: string | null;
  checked_in_by?: string | null;
  cancelled_at?: string | null;
};

export type CheckInInsert = Omit<CheckIn, 'id' | 'timestamp'> & {
  id?: string;
  timestamp?: string;
};

export type StaffAssignmentInsert = Omit<StaffAssignment, 'id' | 'created_at'> & {
  id?: string;
};

export type EventReminderInsert = Omit<EventReminder, 'id' | 'sent_at' | 'completed_at'> & {
  id?: string;
  sent_at?: string;
  completed_at?: string | null;
};

/**
 * Update types (for modifying existing records)
 * All fields optional except id
 */
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at'>>;

export type EventUpdate = Partial<Omit<Event, 'id' | 'organizer_id' | 'slug' | 'created_at'>>;

export type TicketTypeUpdate = Partial<Omit<TicketType, 'id' | 'event_id' | 'created_at'>>;

export type RegistrationUpdate = Partial<
  Omit<Registration, 'id' | 'event_id' | 'user_id' | 'ticket_type_id' | 'ticket_code' | 'qr_data' | 'created_at'>
>;

export type CheckInUpdate = Partial<Omit<CheckIn, 'id' | 'registration_id' | 'staff_id' | 'timestamp'>>;

export type StaffAssignmentUpdate = Partial<
  Omit<StaffAssignment, 'id' | 'event_id' | 'staff_id' | 'assigned_by' | 'created_at'>
>;

export type EventReminderUpdate = Partial<Omit<EventReminder, 'id' | 'event_id' | 'reminder_type' | 'sent_at'>>;

/**
 * Joined/populated types (with relationships)
 * Used for SELECT queries with joins
 */
export interface EventWithOrganizer extends Event {
  organizer: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
}

export interface EventWithTicketTypes extends Event {
  ticket_types: TicketType[];
}

export interface EventWithStats extends Event {
  statistics: EventStatistics;
}

export interface RegistrationWithDetails extends Registration {
  event: Pick<Event, 'id' | 'title' | 'slug' | 'start_date' | 'end_date' | 'location' | 'image_url'>;
  ticket_type: Pick<TicketType, 'id' | 'name' | 'price'>;
  user: Pick<Profile, 'id' | 'full_name' | 'email'>;
}

export interface CheckInWithDetails extends CheckIn {
  registration: {
    id: string;
    ticket_code: string;
    user: Pick<Profile, 'id' | 'full_name' | 'email'>;
    ticket_type: Pick<TicketType, 'name'>;
  };
  staff: Pick<Profile, 'id' | 'full_name'>;
}

/**
 * Supabase Database type definition
 * Used for type-safe Supabase client
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      events: {
        Row: Event;
        Insert: EventInsert;
        Update: EventUpdate;
      };
      ticket_types: {
        Row: TicketType;
        Insert: TicketTypeInsert;
        Update: TicketTypeUpdate;
      };
      registrations: {
        Row: Registration;
        Insert: RegistrationInsert;
        Update: RegistrationUpdate;
      };
      check_ins: {
        Row: CheckIn;
        Insert: CheckInInsert;
        Update: CheckInUpdate;
      };
      staff_assignments: {
        Row: StaffAssignment;
        Insert: StaffAssignmentInsert;
        Update: StaffAssignmentUpdate;
      };
      event_reminders: {
        Row: EventReminder;
        Insert: EventReminderInsert;
        Update: EventReminderUpdate;
      };
    };
    Views: {
      event_statistics: {
        Row: EventStatistics;
      };
    };
    Functions: {
      // Database functions will be added here as implemented
    };
    Enums: {
      user_role: UserRole;
      event_status: EventStatus;
      registration_status: RegistrationStatus;
      checkin_method: CheckInMethod;
      reminder_type: ReminderType;
    };
  };
}

/**
 * Helper type for extracting table names
 */
export type Tables = Database['public']['Tables'];
export type TableName = keyof Tables;

/**
 * Helper type for extracting row types
 */
export type Row<T extends TableName> = Tables[T]['Row'];
export type Insert<T extends TableName> = Tables[T]['Insert'];
export type Update<T extends TableName> = Tables[T]['Update'];
