import { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient } from "../config/db";
import { getDistance } from "geolib";
import { Event } from "../types/event";
import { Member } from "../types/member";
import { hoursMap, HoursType } from "../types/hours";
import UserRoleService from "./userService";
import { MemberInfoService } from "./memberInfoService";

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

  async addEvent(name: string, date: string, location: string, description: string, lat: number, long: number, time: string, hours: number, hours_type: string, sponsors: string[]) {
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
                    sponsors_attending: sponsors
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
