import { NextResponse } from 'next/server'
import { getRecentProfiles } from '@/lib/profile-store'

const RECENT_PROFILES_LIMIT = 10;

export async function GET() {
  const profiles = await getRecentProfiles(RECENT_PROFILES_LIMIT)
  return NextResponse.json({ profiles })
}