import { NextResponse } from 'next/server'
import { getRecentProfiles } from '@/lib/profile-store'

const fetchRecentProfiles = async (limit: number) => {
  const profiles = await getRecentProfiles(limit)
  return profiles
}

export async function GET() {
  const profiles = await fetchRecentProfiles(10)
  return NextResponse.json({ profiles })
}