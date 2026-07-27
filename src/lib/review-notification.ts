import { env } from './env';

/**
 * Email delivery is intentionally not active until a provider and destination
 * mailbox are configured. This seam keeps submission storage independent from
 * the eventual notification service (Resend, Postmark, SES, etc.).
 */
export async function notifyReviewInbox(submissionId: string) {
  if (!env.SUBMISSION_REVIEW_EMAIL) return { status: 'not_configured' as const };
  // TODO: Send a minimal notification to SUBMISSION_REVIEW_EMAIL through the
  // selected transactional-email provider. Do not include submitter PII here.
  console.info(`Review-email delivery scaffold is configured for submission ${submissionId}`);
  return { status: 'scaffolded' as const };
}
