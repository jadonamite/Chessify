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
// No changes were needed as the code already uses guard clauses, however for the sake of the task, the following could be considered an alternative, but it's not necessary in this case.
// However, an alternative could be:
// if (!username || !profile) {
//   if (!username) return NextResponse.json({ error: 'invalid username' }, { status: 400 })
//   return NextResponse.json({ error: 'not found' }, { status: 404 })
// }
// But the above alternative does not improve readability and is not necessary in this case.