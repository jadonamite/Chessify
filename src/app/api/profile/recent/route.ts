import { NextResponse } from 'next/server'
import { getRecentProfiles } from '@/lib/profile-store'

const getRecentProfilesLimit = () => 10;

export async function GET() {
  const limit = getRecentProfilesLimit();
  const profiles = await getRecentProfiles(limit)
  return NextResponse.json({ profiles })
}