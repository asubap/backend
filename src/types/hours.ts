export type HoursType = 'development' | 'professional' | 'service' | 'social';
export type HoursKey = 'development_hours' | 'professional_hours' | 'service_hours' | 'social_hours';

export const hoursMap: Record<HoursType, HoursKey> = {
    'development': 'development_hours',
    'professional': 'professional_hours',
    'service': 'service_hours',
    'social': 'social_hours'
} as const;