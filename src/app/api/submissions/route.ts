import { createId } from '@paralleldrive/cuid2';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { submissions } from '../../../../drizzle/schema';
import { db } from '@/lib/db';
import { getLlmProvider } from '@/lib/llm-provider';
import { notifyReviewInbox } from '@/lib/review-notification';

const payload = z.object({ buildingId: z.string().min(1), title: z.string().trim().min(3).max(140), content: z.string().trim().min(20).max(10_000), submitterName: z.string().trim().max(120).optional(), submitterEmail: z.string().email().optional() });
export async function POST(request: NextRequest) {
  const parsed = payload.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const moderation = await getLlmProvider().moderateContent(parsed.data.content);
  const row = { id: createId(), ...parsed.data, status: moderation.flagged ? 'needs_edit' : 'pending', moderationScore: moderation.score, moderationReasons: moderation.reasons, tags: [] as string[] };
  await db.insert(submissions).values(row);
  const reviewNotification = await notifyReviewInbox(row.id);
  return NextResponse.json({ id: row.id, status: row.status, reviewNotification: reviewNotification.status }, { status: 201 });
}
