import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { passwordMatches, setAdminSession } from '@/lib/auth';
export async function POST(request: NextRequest) { const parsed = z.object({ password: z.string() }).safeParse(await request.json()); if (!parsed.success || !passwordMatches(parsed.data.password)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); await setAdminSession(); return NextResponse.json({ ok: true }); }
