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
