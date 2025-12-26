import { Member } from '../types/member';

/**
 * Valid member ranks
 */
export const VALID_RANKS = ['pledge', 'inducted', 'alumni'] as const;
export type MemberRank = typeof VALID_RANKS[number];

/**
 * Check if a rank string is valid
 * @param rank - The rank to validate (case-insensitive)
 * @returns True if rank is valid
 */
export function isValidRank(rank: string): boolean {
  if (!rank || typeof rank !== 'string') return false;
  const normalizedRank = rank.toLowerCase().trim();
  return VALID_RANKS.includes(normalizedRank as MemberRank);
}

/**
 * Normalize rank to lowercase
 * @param rank - The rank to normalize
 * @returns Normalized rank string
 */
export function normalizeRank(rank: string): string {
  return rank.toLowerCase().trim();
}

/**
 * Check if a member is an alumni
 * @param member - The member object with rank property
 * @returns True if member is alumni
 */
export function isAlumni(member: Member | { rank: string }): boolean {
  if (!member || !member.rank) return false;
  return member.rank.toLowerCase() === 'alumni';
}

/**
 * Check if a member can participate in events
 * Alumni cannot RSVP, check-in, or be manually added to events
 * @param member - The member object with rank property
 * @returns True if member can participate
 */
export function canParticipateInEvents(member: Member | { rank: string }): boolean {
  return !isAlumni(member);
}
