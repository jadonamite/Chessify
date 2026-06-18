import { NextRequest, NextResponse } from 'next/server' 
import { getProfileByAddress, validateUsername, claimProfile, checkRateLimit, } from '@/lib/profile-store' 
import { isValidProfileAddress, normalizeAddress } from '@/lib/profile-address' 
import { verifyProfileSignature } from '@/lib/verify-signature' 
import type { ChessProfile } from '@/types/profile' 

export async function POST(req: NextRequest) { 
  let body: any 
  try { 
    body = await req.json() 
  } catch { 
    return NextResponse.json({ error: 'invalid json' }, { status: 400 }) 
  } 

  if (!body.address || !body.username || !body.signature || !body.timestamp || !body.publicKey) { 
    return NextResponse.json({ error: 'address, username, signature, timestamp, and publicKey are required' }, { status: 400 }) 
  } 

  const { address, username, displayName = '', bio = '', signature, timestamp, publicKey } = body 

  if (!isValidProfileAddress(address)) { 
    return NextResponse.json({ error: 'invalid address' }, { status: 400 }) 
  } 

  const ts = new Date(timestamp).getTime() 
  if (isNaN(ts) || Date.now() - ts > 5 * 60 * 1000) { 
    return NextResponse.json({ error: 'timestamp expired — re-sign and try again' }, { status: 400 }) 
  } 

  const nameCheck = validateUsername(username ?? '') 
  if (!nameCheck.ok) { 
    return NextResponse.json({ error: nameCheck.reason }, { status: 400 }) 
  } 

  if (displayName.length > 30) { 
    return NextResponse.json({ error: 'displayName max 30 characters' }, { status: 400 }) 
  } 

  if (bio.length > 120) { 
    return NextResponse.json({ error: 'bio max 120 characters' }, { status: 400 }) 
  } 

  const message = `Chessify Profile Claim\n\nUsername: ${username.toLowerCase()}.chess\nAddress: ${address}\nTimestamp: ${timestamp}` 
  const valid = await verifyProfileSignature({ address, message, signature, publicKey }) 
  if (!valid) { 
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 }) 
  } 

  const allowed = await checkRateLimit(address, 'claim', 2, 86400) 
  if (!allowed) { 
    return NextResponse.json({ error: 'rate limit exceeded — max 2 claims per day' }, { status: 429 }) 
  } 

  const existing = await getProfileByAddress(address) 
  if (existing) { 
    return NextResponse.json({ error: 'Profile already exists — use PATCH to update' }, { status: 409 }) 
  } 

  const now = Date.now() 
  const profile: ChessProfile = { 
    address: normalizeAddress(address), 
    username: username.toLowerCase(), 
    displayName: displayName.trim(), 
    bio: bio.trim(), 
    og: false, // set by claimProfile based on total count 
    createdAt: now, 
    updatedAt: now, 
    usernameChangedAt: now, 
  } 

  const result = await claimProfile(profile) 
  if (!result.ok) { 
    return NextResponse.json({ error: result.reason }, { status: 409 }) 
  } 

  return NextResponse.json({ ok: true, username: `${username.toLowerCase()}.chess` }, { status: 201 }) 
}