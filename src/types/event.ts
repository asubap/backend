export type Event = {
    id: number;
    event_name: string;
    event_description: string;
    event_location: string;
    event_lat: number;
    event_long: number;
    event_date: string;
    event_time: string;
    event_rsvped: string[];
    event_attending: string[];
    event_hours: number;
    event_hours_type: string;
    sponsors_attending: string[];
}