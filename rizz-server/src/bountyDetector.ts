import { BountyItem } from './session';

const OFFER_PATTERNS = [
  'i can',
  "i'll",
  'i will',
  'happy to',
  'willing to',
  'able to',
  'i could take',
  "i'll handle",
  "i'll build",
];

const REQUEST_PATTERNS = [
  'need someone to',
  'looking for',
  'can anyone',
  'does anyone',
  'could someone',
  'need help with',
  'who can',
  'we need',
];

export function detectBounty(text: string, speaker: string): BountyItem | null {
  const lower = text.toLowerCase();

  const isOffer = OFFER_PATTERNS.some((p) => lower.includes(p));
  const isRequest = REQUEST_PATTERNS.some((p) => lower.includes(p));

  if (!isOffer && !isRequest) {
    return null;
  }

  // If both match, treat as offer (claimed = true)
  const claimed = isOffer;
  const claimer = isOffer ? speaker : null;

  return {
    text,
    speaker,
    claimer,
    claimed,
    ts: new Date().toISOString(),
  };
}
