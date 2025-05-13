export interface Member {
    id: number;
    user_email: string;
    development_hours: number;
    professional_hours: number;
    service_hours: number;
    social_hours: number;
    links: string | null;
    name: string;
    major: string;
    about: string;
    graduating_year: number;
    profile_photo_url: string | null;
    total_hours: number;
    rank: string;
    role: string;
}
