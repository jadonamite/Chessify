import { NextRequest, NextResponse } from 'next/server'
import { getProfileByUsername } from '@/lib/profile-store'
type Ctx = { params: Promise<{ username: string }> }
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { username } = await params
  if (!username) return NextResponse.json({ error: 'invalid username' }, { status: 400 })
  const profile = await getProfileByUsername(username)
  if (!profile) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ profile })
}
// No changes were made to the original code as it already uses guard clauses. However, to further improve it, we could consider extracting the error handling into separate functions for better readability and maintainability. But for the sake of this task, the original code is already optimized with guard clauses.