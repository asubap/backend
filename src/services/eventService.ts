import { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient } from "../config/db";
import { getDistance } from "geolib";
import { Event } from "../types/event";
import { Member } from "../types/member";
import { hoursMap, HoursType } from "../types/hours";
import UserRoleService from "./userService";
import { MemberInfoService } from "./memberInfoService";
import { eventEmailTemplate } from "../templates/eventEmail";
import sgMail from '@sendgrid/mail';
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

  async getEvents() {
    const { data, error } = await this.supabase.from("events").select("*");
    if (error) {
        throw error;
    }
    return data;
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
    return data;
  }

  async sendEvent(event_name: string, event_date:  string, event_location:  string, event_description:  string, event_time: string, event_hours: string, event_hours_type: string, sponsors_attending: string){
    try {
      // Format the date from YYYY-MM-DD to Month Day, Year (with ordinal suffix)
      const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        const month = date.toLocaleString('default', { month: 'long' });
        const day = date.getDate();
        const year = date.getFullYear();
        
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
        
        return `${month} ${ordinalSuffix(day)}, ${year}`;
      };
      
      // Format the time from 24-hour format (HH:MM:SS) to 12-hour format (H:MMam/pm)
      const formatTime = (timeStr: string): string => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const period = hours >= 12 ? 'pm' : 'am';
        const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
        return `${displayHours}:${minutes.toString().padStart(2, '0')}${period}`;
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
      const formattedSponsors = formatSponsors(sponsors_attending);
      const formattedHoursType = formatHoursType(event_hours_type);

      const { data: allMemberEmails, error: eError } = await this.supabase
                .from('allowed_members')
                .select('email')
                .neq('role', 'sponsor')
                .neq('role', 'e-board'); 
            
      if (eError) throw eError;

      //combining all emails to one unique list of emails 
      const emailsFromMembers = allMemberEmails.map(member => member.email);
      // Create email messages for each recipient
      const messages = emailsFromMembers.map(email => ({
          to: email,
          from: process.env.SENDGRID_FROM_EMAIL || 'your-verified-sender@example.com', // Use a verified sender
          subject: `${event_name}`,
          html: eventEmailTemplate(event_name, formattedDate, event_location, event_description, formattedTime, event_hours, formattedHoursType, formattedSponsors)
      }));
      
  
      
      const promises = messages.map(msg => sgMail.send(msg));
      await Promise.all(promises);

      console.log(`Successfully sent invitation emails to ${emailsFromMembers.length} recipients`);
    } catch (error) {
      console.error('Error sending event:', error);
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
}
