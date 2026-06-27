import { NextRequest, NextResponse } from 'next/server';
import { getBatchProfiles } from '@/lib/profile-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'invalid json' }, { status: 400 });
    }

    const { addresses } = body;
    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json({ error: 'addresses array required' }, { status: 400 });
    }

    if (addresses.length > 200) {
      return NextResponse.json({ error: 'max 200 addresses per batch' }, { status: 400 });
    }

    const profiles = await getBatchProfiles(addresses);
    return NextResponse.json({ profiles });
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
}