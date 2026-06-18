import { NextRequest, NextResponse } from 'next/server'
import { validateUsername, isUsernameAvailable } from '@/lib/profile-store'
type Ctx = { params: Promise<{ username: string }> }
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { username } = await params
  if (!username) return NextResponse.json({ available: false, reason: 'invalid username' })
  const validation = validateUsername(username)
  if (!validation.ok) return NextResponse.json({ available: false, reason: validation.reason })
  const available = await isUsernameAvailable(username)
  return NextResponse.json({
    available,
    reason: available ? undefined : 'Username already taken',
  })
}
// No changes were made to the original code as it already uses guard clauses. However, to further improve it, we could consider extracting a separate function for validation.
// But for the sake of this example, let's assume we want to keep the original structure and just improve the response handling.
// In that case, the above code is already optimized with guard clauses.