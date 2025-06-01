import { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient } from "../config/db";
import { getDistance } from "geolib";
import { Event } from "../types/event";
import { Member } from "../types/member";
import { hoursMap, HoursType } from "../types/hours";
import UserRoleService from "./userService";
import { MemberInfoService } from "./memberInfoService";
import sgMail from '@sendgrid/mail';


interface UserDetails {
  id: string;
  email: string;
  role: string;
  [key: string]: any;
}


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
  
  async getUsersByIds(user_ids: string[]) {
    if (!user_ids || user_ids.length === 0) return [];
    
    // Use service role client for admin API
    const adminClient = createSupabaseClient(undefined, true);
    
    // Get all users in a single query
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers();
    if (authError) throw authError;

    // Create a map of auth user IDs to their emails
    const authUserMap = new Map(authUsers.users.map(user => [user.id, user.email]));

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
    const emailToIdMap = new Map(authUsers.users.map(user => [user.email, user.id]));

    // Enrich member data with auth user IDs
    const enrichedMemberData = memberData.map(member => ({
      ...member,
      id: emailToIdMap.get(member.email) // Add the auth user ID
    }));

    return enrichedMemberData;
  }

  async getEvents() {
    const { data, error } = await this.supabase.from("events").select("*");
    if (error) {
        throw error;
    }

    // Process each event to include user information
    const processedEvents = await Promise.all(data.map(async (event) => {
      // Get all unique user IDs from both RSVPs and attendees
      const allUserIds = [
        ...(event.event_rsvped || []),
        ...(event.event_attending || [])
      ];

      // Get user details in a single batch
      const userDetails = await this.getUsersByIds(allUserIds);

      // Create a map for quick lookup
      const userMap = new Map(userDetails.map((user: UserDetails) => [user.id, user]));

      // Separate users into RSVPs and attendees
      const rsvpedUsers = (event.event_rsvped || [])
        .map((id: string) => userMap.get(id))
        .filter(Boolean);

      const attendingUsers = (event.event_attending || [])
        .map((id: string) => userMap.get(id))
        .filter(Boolean);

      return {
        ...event,
        rsvped_users: rsvpedUsers,
        attending_users: attendingUsers
      };
    }));

    return processedEvents;
  }

  async addEvent(name: string, date: string, location: string, description: string, lat: number, long: number, time: string, hours: number, hours_type: string, sponsors: string[], check_in_window: number) {
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
                    check_in_window: check_in_window
                });

        if (error) console.log(error);
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

  async getEventID(event_id: number) {
    const { data, error } = await this.supabase
      .from("events")
      .select("*")
      .eq("id", event_id);

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error(`No event found with id: ${event_id}`);
    }

    const event = data[0];
    
    // Get all unique user IDs from both RSVPs and attendees
    const allUserIds = [
      ...(event.event_rsvped || []),
      ...(event.event_attending || [])
    ];

    // Get user details in a single batch
    const userDetails = await this.getUsersByIds(allUserIds);

    // Create a map for quick lookup
    const userMap = new Map(userDetails.map((user: UserDetails) => [user.id, user]));

    // Separate users into RSVPs and attendees
    const rsvpedUsers = (event.event_rsvped || [])
      .map((id: string) => userMap.get(id))
      .filter(Boolean);

    const attendingUsers = (event.event_attending || [])
      .map((id: string) => userMap.get(id))
      .filter(Boolean);

    return [{
      ...event,
      rsvped_users: rsvpedUsers,
      attending_users: attendingUsers
    }];
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
    console.error(error)
  }));
      await Promise.all(promises);

      console.log(`Successfully sent invitation emails to ${emailsFromMembers.length} users.`);
    } catch (error) {
      console.error('Error sending event:', error?.response?.body?.errors);
      throw error;
    }
  }

  async verifyLocationAttendance(eventId: string, userId: string, userLat: number, userLong: number) {
    try {

      const eventIdNumber = parseInt(eventId);
      const event: Event = (await this.getEventID(eventIdNumber))[0];

      if (event.event_rsvped && !event.event_rsvped.includes(userId)) {
        throw new Error("You have not RSVP'd for this event");
      }

      const distance = getDistance(
        { latitude: userLat, longitude: userLong },
        { latitude: event.event_lat, longitude: event.event_long }
      ) ?? (() => { throw new Error("Failed to calculate distance") })();

      distance <= 50 || (() => { throw new Error(`You are too far from the event location (${Math.round(distance)}m away, maximum distance is 5m)`) })();

      if (event.event_attending && event.event_attending.includes(userId)) {
        throw new Error("You have already checked in to this event");
      }

      const currentAttending: string[] = Array.isArray(event.event_attending) ? event.event_attending : [];
      currentAttending.push(userId);

      await this.editEvent(eventId, { event_attending: currentAttending.map(id => id.toString()) });

      const userEmail = await this.userService.getUserEmail(userId) ?? (() => { throw new Error("User email not found") })();

      const memberInfoService = new MemberInfoService();
      const user: Member = (await memberInfoService.getMemberInfo(userEmail))[0];

      const eventHoursType = event.event_hours_type.replace(/\s+/g, '_') as HoursType;
      const hoursKey = hoursMap[eventHoursType] ?? (() => { throw new Error(`Invalid hours type: ${eventHoursType}`) })();
      
      const currentHours = Number(user[hoursKey]) || 0;
      const newHours = currentHours + event.event_hours;

      await memberInfoService.editMemberInfo(userEmail, { [hoursKey]: newHours.toString() });
      
      return "Check-in confirmed!";
    } catch (error) {
      console.error('verifyLocationAttendance error:', error);
      throw error;
    }
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
    try {
      const eventIdNumber = parseInt(eventId);
      const event: Event = (await this.getEventID(eventIdNumber))[0];

      // Initialize event_rsvped if it doesn't exist
      let currentRsvps: string[] = event.event_rsvped || [];
      
      // Check if user is already RSVP'd
      if (currentRsvps.includes(userId)) {
        throw new Error("You have already RSVP'd for this event");
      }

      // Add user to RSVPs
      currentRsvps.push(userId);
      
      await this.editEvent(eventId, { event_rsvped: currentRsvps.map(id => id.toString())});

      return "RSVP confirmed!";
    } catch (error) {
      console.error('rsvpForEvent error:', error);
      throw error;
    }
  }

  async unRsvpForEvent(eventId: string, userId: string) {
    try {
      // Convert eventId to number for proper comparison
      const numericEventId = parseInt(eventId);
      const event: Event = (await this.getEventID(numericEventId))[0];

      // Initialize event_rsvped if it doesn't exist
      let currentRsvps: string[] = event.event_rsvped || [];
      
      // Check if user is already RSVP'd
      if (!currentRsvps.includes(userId)) {
        throw new Error("You have not RSVP'd for this event");
      }

      // Remove user from the array
      const updatedRsvps = currentRsvps.filter(id => id !== userId);

      await this.editEvent(eventId, { event_rsvped: updatedRsvps.map(id => id.toString())});

      return "RSVP removed!";
    } catch (error) {
      console.error('unRsvpForEvent error:', error);
      throw error;
    }
  }

  async addMemberAttending(eventId: string, userEmail: string) {
    try {
      const eventIdNumber = parseInt(eventId);
      const event: Event = (await this.getEventID(eventIdNumber))[0];

      // Get user ID using the userService
      const userId = await this.userService.getUserIdByEmail(userEmail);

      // Check if user is already attending
      if (event.event_attending && event.event_attending.includes(userId)) {
        throw new Error("User is already attending this event");
      }

      // Add user to attending list
      const currentAttending: string[] = Array.isArray(event.event_attending) ? event.event_attending : [];
      currentAttending.push(userId);

      await this.editEvent(eventId, { event_attending: currentAttending.map(id => id.toString()) });

      // Update user's hours
      const memberInfoService = new MemberInfoService();
      const userInfo: Member = (await memberInfoService.getMemberInfo(userEmail))[0];

      const eventHoursType = event.event_hours_type.replace(/\s+/g, '_') as HoursType;
      const hoursKey = hoursMap[eventHoursType] ?? (() => { throw new Error(`Invalid hours type: ${eventHoursType}`) })();
      
      const currentHours = Number(userInfo[hoursKey]) || 0;
      const newHours = currentHours + event.event_hours;

      await memberInfoService.editMemberInfo(userEmail, { [hoursKey]: newHours.toString() });
      
      return "Member successfully added to event and hours updated!";
    } catch (error) {
      console.error('addMemberAttending error:', error);
      throw error;
    }
  }

  async deleteMemberAttending(eventId: string, userEmail: string) {
    try {
      const eventIdNumber = parseInt(eventId);
      const event: Event = (await this.getEventID(eventIdNumber))[0];

      // Get user ID using the userService
      const userId = await this.userService.getUserIdByEmail(userEmail);

      // Check if user is attending
      if (!event.event_attending || !event.event_attending.includes(userId)) {
        throw new Error("User is not attending this event");
      }

      // Remove user from attending list
      const currentAttending: string[] = Array.isArray(event.event_attending) ? event.event_attending : [];
      const updatedAttending = currentAttending.filter(id => id !== userId);

      await this.editEvent(eventId, { event_attending: updatedAttending.map(id => id.toString()) });

      // Update user's hours
      const memberInfoService = new MemberInfoService();
      const userInfo: Member = (await memberInfoService.getMemberInfo(userEmail))[0];

      const eventHoursType = event.event_hours_type.replace(/\s+/g, '_') as HoursType;
      const hoursKey = hoursMap[eventHoursType] ?? (() => { throw new Error(`Invalid hours type: ${eventHoursType}`) })();
      
      const currentHours = Number(userInfo[hoursKey]) || 0;
      const newHours = Math.max(0, currentHours - event.event_hours); // Ensure hours don't go below 0

      await memberInfoService.editMemberInfo(userEmail, { [hoursKey]: newHours.toString() });
      
      return "Member successfully removed from event and hours updated!";
    } catch (error) {
      console.error('deleteMemberAttending error:', error);
      throw error;
    }
  }
}
