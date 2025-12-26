export interface MemberSummary {
  name: string | null;
  user_email: string;
  user_id: string;
}

export type AttendanceStatus = 'rsvped' | 'attended';

export interface EventAttendanceRecord {
  status: AttendanceStatus;
  member_info: MemberSummary;
}

export interface SupabaseEventResponse {
  id: number;
  event_name: string;
  event_description: string;
  event_location: string;
  event_lat: number;
  event_long: number;
  event_date: string;
  event_time: string;
  event_hours: number;
  event_hours_type: string;
  sponsors_attending: string[] | null;
  check_in_window: number;
  event_limit: number;
  check_in_radius: number;
  is_hidden: boolean;
  event_attendance: EventAttendanceRecord[];
}

export interface Event {
  id: number;
  event_name: string;
  event_description: string;
  event_location: string;
  event_lat: number;
  event_long: number;
  event_date: string;
  event_time: string;
  event_hours: number;
  event_hours_type: string;
  sponsors_attending: string[];
  check_in_window: number;
  event_limit: number;
  check_in_radius: number;
  is_hidden: boolean;
  event_rsvped: string[];
  rsvped_users: MemberSummary[];
  event_attending: string[];
  attending_users: MemberSummary[];
}

// Role-based event views (for security isolation)

// Public view - minimal data for unauthenticated users (only basic info, no sensitive details)
export interface PublicEvent {
  id: number;
  event_name: string;
  event_date: string;
}

// Member view - no PII, geolocation only if user RSVP'd
export interface MemberEvent {
  id: number;
  event_name: string;
  event_description: string;
  event_location: string;
  event_lat: number | null; // null if user hasn't RSVP'd
  event_long: number | null; // null if user hasn't RSVP'd
  event_date: string;
  event_time: string;
  event_hours: number;
  event_hours_type: string;
  sponsors_attending: string[];
  check_in_window: number;
  event_limit: number;
  check_in_radius: number;
  // SECURITY: is_hidden, event_rsvped, event_attending arrays - E-BOARD ONLY
  rsvp_count: number;
  attending_count: number;
  user_rsvped: boolean; // Whether current user has RSVP'd
  user_attended: boolean; // Whether current user has checked in/attended
}

// Participant info for e-board
export interface EventParticipantInfo {
  user_id: string;
  name: string | null;
  user_email: string;
}

// E-Board view - includes full details and sensitive fields
export interface EBoardEvent extends MemberEvent {
  event_lat: number; // Always visible
  event_long: number; // Always visible
  is_hidden: boolean; // E-board only
  event_rsvped: EventParticipantInfo[]; // Full participant objects with emails - E-board only
  event_attending: EventParticipantInfo[]; // Full participant objects with emails - E-board only
}

// Participant details - ONLY accessible via separate e-board endpoint
export interface EventParticipant {
  user_id: string;
  name: string | null;
  user_email: string;
  status: 'rsvped' | 'attended';
}

export interface EventParticipantsResponse {
  event_id: number;
  event_name: string;
  participants: EventParticipant[];
}

export type RoleBasedEvent = PublicEvent | MemberEvent | EBoardEvent;
