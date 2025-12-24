export type HoursType = 'development' | 'professional' | 'service' | 'social' | 'n/a';
export type HoursKey = 'development_hours' | 'professional_hours' | 'service_hours' | 'social_hours';

export const hoursMap: Record<Exclude<HoursType, 'n/a'>, HoursKey> = {
    'development': 'development_hours',
    'professional': 'professional_hours',
    'service': 'service_hours',
    'social': 'social_hours'
} as const;

export const VALID_EVENT_HOURS_TYPES: readonly HoursType[] = ['development', 'professional', 'service', 'social', 'n/a'] as const;