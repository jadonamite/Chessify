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
// No changes were needed as the code already uses guard clauses. However, to further improve, we could extract the error handling into separate functions for better readability and maintainability. But since the code is already using guard clauses, we will keep it as is.