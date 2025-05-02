import { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient } from "../config/db";
import extractEmail from "../utils/extractEmail";
import { getDistance } from "geolib";

export class EventService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createSupabaseClient();
  }

  setToken(token: string) {
    this.supabase = createSupabaseClient(token);
  }

  async getEvents() {
    const { data, error } = await this.supabase.from("events").select("*");
    if (error) {
        throw error;
    }
    return data;
  }


  async getEventsByName(name: string) {
    const { data, error } = await this.supabase
      .from("events")
      .select("*")
      .ilike("name", `%${name}%`);
    if (error) throw error;
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
                    event_location_lat: lat,
                    event_location_long: long,
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

  async getEventsByDate(date: string) {
    const { data: beforeData, error: beforeError } = await this.supabase
      .from("events")
      .select("*")
      .lt("date", date)
      .order("date", { ascending: false });
    if (beforeError) throw beforeError;

    const { data: afterData, error: afterError } = await this.supabase
      .from("events")
      .select("*")
      .gt("date", date)
      .order("date", { ascending: true });
    if (afterError) throw afterError;

    return { before: beforeData, after: afterData };
  }

  async getPublicEvents() {
    console.log('EventService: Getting public events from Supabase...');
    const { data, error } = await this.supabase
      .from("events")
      .select("id, event_name, event_description, event_date")
      .order('event_date', { ascending: true });
    
    if (error) {
      console.error('EventService: Error fetching public events:', error);
      throw error;
    }

    console.log('EventService: Public events fetched successfully:', data);
    return data;
  }

  async rsvpForEvent(eventId: string, userId: string) {
    try {
      console.log('Processing RSVP for event:', eventId, 'user:', userId);

      // Get current rsvp_users array
      const { data: event, error: fetchError } = await this.supabase
        .from("events")
        .select("rsvp_users")
        .eq("id", eventId)
        .single();

      if (fetchError) {
        console.error('Error fetching event RSVPs:', fetchError);
        throw new Error('Failed to fetch event RSVPs');
      }

      // Create new array with user added
      const currentRsvps = event?.rsvp_users || [];
      if (currentRsvps.includes(userId)) {
        throw new Error('You have already RSVP\'d for this event');
      }

      currentRsvps.push(userId);

      // Update the event with new array
      const { error: rsvpError } = await this.supabase
        .from("events")
        .update({
          rsvp_users: currentRsvps
        })
        .eq("id", eventId);

      if (rsvpError) {
        console.error('Error recording RSVP:', rsvpError);
        throw new Error(`Failed to record RSVP: ${rsvpError.message}`);
      }

      console.log('RSVP recorded successfully for user:', userId);
      return "RSVP confirmed!";
    } catch (error) {
      console.error('rsvpForEvent error:', error);
      throw error;
    }
  }
}

