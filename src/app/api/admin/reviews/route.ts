import { createId } from '@paralleldrive/cuid2';
import { and, desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminReviews, submissions } from '../../../../../drizzle/schema';
import { isAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

const reviewPayload = z.object({ submissionId: z.string().min(1), decision: z.enum(['approve', 'reject', 'request_edit']), notes: z.string().max(2_000).optional() });

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rows = await db.select().from(submissions).where(eq(submissions.status, 'pending')).orderBy(desc(submissions.createdAt)).limit(100);
  return NextResponse.json({ data: rows });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = reviewPayload.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const status = parsed.data.decision === 'approve' ? 'approved' : parsed.data.decision === 'reject' ? 'rejected' : 'needs_edit';
  const result = await db.update(submissions).set({ status, updatedAt: new Date().toISOString() }).where(and(eq(submissions.id, parsed.data.submissionId), eq(submissions.status, 'pending'))).returning({ id: submissions.id });
  if (!result.length) return NextResponse.json({ error: 'Submission not found or already reviewed' }, { status: 409 });
  await db.insert(adminReviews).values({ id: createId(), submissionId: parsed.data.submissionId, reviewer: 'environment-password-admin', decision: parsed.data.decision, notes: parsed.data.notes });
  return NextResponse.json({ ok: true, status });
}
