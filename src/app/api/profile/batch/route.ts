import { NextRequest, NextResponse } from 'next/server'
import { getBatchProfiles } from '@/lib/profile-store'

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!body || !body.addresses) return NextResponse.json({ error: 'addresses object required' }, { status: 400 })
  if (!Array.isArray(body.addresses) || body.addresses.length === 0) return NextResponse.json({ error: 'addresses array required' }, { status: 400 })
  if (body.addresses.length > 200) return NextResponse.json({ error: 'max 200 addresses per batch' }, { status: 400 })

  const profiles = await getBatchProfiles(body.addresses)
  return NextResponse.json({ profiles })
}