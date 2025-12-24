import { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient } from "../config/db";
import { getDistance } from "geolib";
import UserRoleService from "./userService";
import sgMail from '@sendgrid/mail';
import { Event, SupabaseEventResponse, EventAttendanceRecord } from "../types/event";

export class EventService {

  private supabase: SupabaseClient;
  private userService: UserRoleService;
  
  constructor() {
    this.supabase = createSupabaseClient();
    this.userService = new UserRoleService();
  }

  setToken(token: string) {
    this.supabase = createSupabaseClient(token);
    this.userService.setToken(token);
  }

  /**
   * Helper method to get member_info.id from user_id using the member_user_mapping view
   * @param user_id - The auth user ID
   * @returns The member_info.id
   */
  private async getMemberIdByUserId(user_id: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('member_user_mapping')
      .select('id')
      .eq('user_id', user_id)
      .single();

    if (error || !data) throw new Error("Member not found");
    return data.id;
  }

  // this can be severely optimized -> all of this is not necessary
  // DO NOT FORGET
  async getUsersByIds(user_ids: string[]) {
    if (!user_ids || user_ids.length === 0) return [];
    
    // Use service role client for admin API
    const adminClient = createSupabaseClient(undefined, true);
    
    // Get all users across all pages
    let allUsers: any[] = [];
    let page = 1;
    let perPage = 1000;
    
    while (true) {
      const { data: { users }, error } = await adminClient.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      if (users.length === 0) break;
      allUsers = allUsers.concat(users);
      if (users.length < perPage) break; // No more pages
      page++;
    }
    
    // Create a map of auth user IDs to their emails
    const authUserMap = new Map(allUsers.map(user => [user.id, user.email]));

    // Get the emails for our user IDs
    const userEmails = user_ids
      .map(id => authUserMap.get(id))
      .filter((email): email is string => email !== undefined);

    if (userEmails.length === 0) return [];

    // Get user details from allowed_members in a single query
    const { data: memberData, error: memberError } = await this.supabase
      .from('allowed_members')
      .select('*')
      .in('email', userEmails);

    if (memberError) throw memberError;

    // Create a map of emails to auth user IDs
    const emailToIdMap = new Map(allUsers.map(user => [user.email, user.id]));

    // Enrich member data with auth user IDs
    const enrichedMemberData = memberData.map(member => ({
      ...member,
      id: emailToIdMap.get(member.email) // Add the auth user ID
    }));

    return enrichedMemberData;
  }


  async getEvents(): Promise<Event[]> {
    const { data: events, error } = await this.supabase
      .from("events")
      .select(`
        *,
        event_attendance (
          status,
          member_info (
            user_email,
            name,
            user_id
          )
        )
      `)
      .order('event_date', { ascending: false });

    if (error) throw error;

    // Transform to match frontend expectations
    const processedEvents: Event[] = events?.map((event: SupabaseEventResponse) => {
      const attendance = event.event_attendance || [];

      const rsvpedAttendance = attendance.filter((a: EventAttendanceRecord) => a.status === 'rsvped');
      const attendedAttendance = attendance.filter((a: EventAttendanceRecord) => a.status === 'attended');

      return {
        id: event.id,
        event_name: event.event_name,
        event_description: event.event_description,
        event_location: event.event_location,
        event_lat: event.event_lat,
        event_long: event.event_long,
        event_date: event.event_date,
        event_time: event.event_time,
        event_hours: event.event_hours,
        event_hours_type: event.event_hours_type,
        sponsors_attending: event.sponsors_attending || [],
        check_in_window: event.check_in_window,
        event_limit: event.event_limit,
        check_in_radius: event.check_in_radius,
        is_hidden: event.is_hidden,
        event_rsvped: rsvpedAttendance.map((a: EventAttendanceRecord) => a.member_info.user_id).filter(Boolean),
        rsvped_users: rsvpedAttendance.map((a: EventAttendanceRecord) => a.member_info),
        event_attending: attendedAttendance.map((a: EventAttendanceRecord) => a.member_info.user_id).filter(Boolean),
        attending_users: attendedAttendance.map((a: EventAttendanceRecord) => a.member_info)
      };
  }) || [];

  return processedEvents;
}

  async addEvent(name: string, date: string, location: string, description: string, lat: number, long: number, time: string, hours: number, hours_type: string, sponsors: string[], check_in_window: number, check_in_radius: number, event_limit: number, is_hidden: boolean) {
    const { data, error } = await this.supabase
        .from('events')
        .insert(
            {
              event_time: time,
              event_hours: hours,
              event_hours_type: hours_type,
              event_name: name,
              event_date: date,
              event_location: location,
              event_lat: lat,
              event_long: long,
              event_description: description,
              sponsors_attending: sponsors,
              check_in_window: check_in_window,
              check_in_radius: check_in_radius,
              event_limit: event_limit,
              is_hidden: is_hidden
            });

    if (error) throw new Error(error.message);
    return data;
  }

  async editEvent(event_id: string, updateData: Record<string, any>) {
    const { data, error } = await this.supabase
      .from("events")
      .update(updateData)
      .eq("id", event_id);
    if (error) throw error;
    return data;
  }

  async deleteEvent(event_id: string) {
    const { data, error } = await this.supabase
      .from("events")
      .delete()
      .eq("id", event_id);
    if (error) throw error;
    return data;
  }

  async getEventForCheckin(eventId: string) {
    const { data, error } = await this.supabase
      .from("events")
      .select("id, event_lat, event_long, check_in_radius")
      .eq("id", eventId)
      .single();
      
    if (error) throw error;
    if (!data) throw new Error(`No event found with id: ${eventId}`);
    
    return data;
  }

  async getEventID(event_id: number) {
    const { data: event, error } = await this.supabase
      .from("events")
      .select(`
        *,
        event_attendance (
          status,
          member_id,
          member_info (
            id,
            user_id,
            name,
            user_email,
            profile_photo_url,
            major,
            graduating_year
          )
        )
      `)
      .eq("id", event_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error(`No event found with id: ${event_id}`);
      }
      throw error;
    }

    const attendance = event.event_attendance || [];

    // Filter in JavaScript (fast, already in memory)
    const rsvpedUsers = attendance
      .filter((a: any) => a.status === 'rsvped')
      .map((a: any) => a.member_info);

    const attendingUsers = attendance
      .filter((a: any) => a.status === 'attended')
      .map((a: any) => a.member_info);

    return {
      ...event,
      rsvped_users: rsvpedUsers,
      attending_users: attendingUsers,
    };
  }

  async sendEvent(event_name: string, event_date:  string, event_location:  string, event_description:  string, event_time: string, event_hours: string, event_hours_type: string, sponsors_attending: string, rsvped_users: any[]){
    try {
      // Format the date from YYYY-MM-DD to Month Day, Year (with ordinal suffix)
      const formatDate = (dateStr: string): string => {
        // Use the date string directly without creating a Date object to avoid timezone issues
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day); // month is 0-indexed
        const monthName = date.toLocaleString('default', { month: 'long' });
        
        // Add ordinal suffix to day
        const ordinalSuffix = (day: number): string => {
          if (day > 3 && day < 21) return `${day}th`;
          switch (day % 10) {
            case 1: return `${day}st`;
            case 2: return `${day}nd`;
            case 3: return `${day}rd`;
            default: return `${day}th`;
          }
        };
        
        return `${monthName} ${ordinalSuffix(day)}, ${year}`;
      };
      
      // Format the time from 24-hour format (HH:MM:SS) to 12-hour format (H:MMam/pm)
      const formatTime = (timeStr: string): string => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const period = hours >= 12 ? 'pm' : 'am';
        const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
        return `${displayHours}:${minutes.toString().padStart(2, '0')}${period}`;
      };
      
      // Process location to extract display name and create Google Maps link
      const processLocation = (location: string): { display: string, mapsLink: string } => {
        const parts = location.split(',');
        const displayLocation = parts.slice(0, 3).join(',').trim();
        const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
        return { display: displayLocation, mapsLink };
      };
      
      // Format sponsors array to string
      const formatSponsors = (sponsors: string): string => {
        if (!sponsors) return "No sponsors";
        
        try {
          const sponsorsArray = typeof sponsors === 'string' ? JSON.parse(sponsors) : sponsors;
          if (!Array.isArray(sponsorsArray) || sponsorsArray.length === 0) return "No sponsors";
          return sponsorsArray.join(", ");
        } catch (e) {
          console.error("Error parsing sponsors:", e);
          return sponsors.toString();
        }
      };

      // Format hours type to capitalize first letter
      const formatHoursType = (hoursType: string): string => {
        if (!hoursType) return "";
        return hoursType.charAt(0).toUpperCase() + hoursType.slice(1).toLowerCase();
      };
      
      // Format the values
      const formattedDate = formatDate(event_date);
      const formattedTime = formatTime(event_time);
      const locationData = processLocation(event_location);
      const formattedSponsors = formatSponsors(sponsors_attending);
      const formattedHoursType = formatHoursType(event_hours_type);

      // Extract emails from rsvped_users instead of querying database
      const emailsFromMembers = rsvped_users.map(user => user.email);
      
      // Create email messages for each recipient using dynamic template
      const messages = emailsFromMembers.map(email => ({
          to: email,
          from: process.env.SENDGRID_FROM_EMAIL || 'your-verified-sender@example.com',
          templateId: process.env.SENDGRID_TEMPLATE_ID, // Your dynamic template ID
          dynamicTemplateData: {
            name: event_name,
            date: formattedDate,
            location_display: locationData.display,
            location_link: locationData.mapsLink,
            description: event_description,
            time: formattedTime,
            hours: event_hours,
            hours_type: formattedHoursType,
            sponsors_attending: formattedSponsors,
            email_type: "event" // To distinguish from announcements in template
          }
      }as sgMail.MailDataRequired));

    
      const promises = messages.map(msg => sgMail
  .send(msg)
  .then(() => {
    console.log('Email sent')
  })
  .catch((error) => {
    console.error(error?.response?.body?.errors);
    throw error;
  }));
      await Promise.all(promises);

      console.log(`Successfully sent invitation emails to ${emailsFromMembers.length} users.`);
    } catch (error: any) {
      console.error('Error sending event:', error?.response?.body?.errors);
      throw error;
    }
  }

  async verifyLocationAttendance(eventId: string, userId: string, userLat: number, userLong: number) {
    const event = await this.getEventForCheckin(eventId);

    const distance = getDistance(
      { latitude: userLat, longitude: userLong },
      { latitude: event.event_lat, longitude: event.event_long }
    ) ?? (() => { throw new Error("Failed to calculate distance") })();

    // get check in radius
    const checkInRadius = event.check_in_radius;

    distance <= checkInRadius || (() => { throw new Error(`You are too far from the event location (${Math.round(distance)}m away, maximum distance is ${checkInRadius}m)`) })();

    const memberId = await this.getMemberIdByUserId(userId);

    // change userId from rsvped to attending (if it exists, else error)
    const { data, error } = await this.supabase
      .from('event_attendance')
      .update({ status: 'attended' })
      .eq('event_id', eventId)
      .eq('member_id', memberId)
      .eq('status', 'rsvped')
      .select();  // ← Returns the updated row

    if (error) throw error;

    // Check if any rows were updated
    if (!data || data.length === 0) {
      // Check current status
      const { data: current } = await this.supabase
        .from('event_attendance')
        .select('status')
        .eq('event_id', eventId)
        .eq('member_id', memberId)
        .single();

      if (current?.status === 'attended') {
        return "Already checked in!"; // Not an error
      } else {
        throw new Error("User has not RSVP'd for this event");
      }
    }

    return "Member successfully marked as attending the event!";
  }

  async getPublicEvents() {
    const { data, error } = await this.supabase
      .from("events")
      .select("id, event_name, event_date")
      .order('event_date', { ascending: true });
    
    if (error) {
      console.error('EventService: Error fetching public events:', error);
      throw error;
    }
    return data;
  }

  async rsvpForEvent(eventId: string, userId: string) {
    const memberId = await this.getMemberIdByUserId(userId);

    // Call the database function
    const { error: rsvpError } = await this.supabase.rpc('rsvp_with_limit_check', {
      p_event_id: eventId,
      p_member_id: memberId
    });

    if (rsvpError) {
      if (rsvpError.message.includes('Event is full')) {
        throw new Error("Event is full. Maximum capacity reached.");
      } else if (rsvpError.code === '23505') {
        throw new Error("You have already RSVP'd for this event");
      }
      throw rsvpError;
    }

    return "RSVP successful!";
  }

  async unRsvpForEvent(eventId: string, userId: string) {
    const memberId = await this.getMemberIdByUserId(userId);

    const { error } = await this.supabase
      .from('event_attendance')
      .delete()
      .eq('event_id', eventId)
      .eq('member_id', memberId)
      .eq('status', 'rsvped');

    if (error) {
      throw new Error("Error processing un-RSVP");
    }

    return "Successfully un-RSVPed from the event!";
  }

  async addMemberAttending(eventId: string, userId: string) {
    const memberId = await this.getMemberIdByUserId(userId);

    // upsert: insert if not exists, update to attended if exists
    const { error } = await this.supabase
      .from('event_attendance')
      .upsert(
        {
          event_id: eventId,
          member_id: memberId,
          status: 'attended'
        },
        {
          onConflict: 'event_id,member_id'
        }
      );

    if (error) throw error;

    console.log("Member marked as attending the event ADMIN style");

    return "Member successfully marked as attending the event!";
  }

  async deleteMemberAttending(eventId: string, userId: string) {
    const memberId = await this.getMemberIdByUserId(userId);

    // then remove the member from the event_rsvped table
    const { error } = await this.supabase
      .from('event_attendance')
      .delete()
      .eq('event_id', eventId)
      .eq('member_id', memberId);

      if (error) {
        throw new Error("Error removing member from event");
      }

      return "Member successfully removed from the event!";
  }
}
