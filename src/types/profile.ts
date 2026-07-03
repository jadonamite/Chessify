export interface ChessProfile {
  address: string           // 0x… (lowercased) for Celo, SP…/ST… (verbatim) for Stacks
  username: string          // "jadon" — displayed as "jadon.chess"
  displayName: string       // freeform, max 30 chars
  bio: string               // max 120 chars
  og: boolean               // first 100 profiles, locked forever
  createdAt: number         // unix ms
  updatedAt: number         // unix ms
  usernameChangedAt: number // unix ms — 30-day username change lock
}

export interface ProfileCheckResult {
  available: boolean
  reason?: string
}

export interface BatchProfileResult {
  profiles: Record<string, ChessProfile | null>
}

export function validateProfile(profile: ChessProfile): ProfileCheckResult {
  if (profile.displayName.length > 30) {
    return { available: false, reason: 'Display name exceeds 30 characters' };
  }
  if (profile.bio.length > 120) {
    return { available: false, reason: 'Bio exceeds 120 characters' };
  }
  return { available: true };
}
