import { z } from 'zod';

const schema = z.object({
  TURSO_DATABASE_URL: z.string().min(1).default('file:./data/nyc-demolition.db'),
  TURSO_AUTH_TOKEN: z.string().optional(),
  LLM_PROVIDER: z.enum(['rule-based', 'openai', 'claude']).default('rule-based'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODERATION_MODEL: z.string().default('omni-moderation-latest'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-haiku-4-5'),
  ADMIN_ACCESS_PASSWORD: z.string().min(16).optional(),
  ADMIN_SESSION_SECRET: z.string().min(32).optional(),
  SUBMISSION_REVIEW_EMAIL: z.string().email().optional(),
});

export const env = schema.parse({
  TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL,
  TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN,
  LLM_PROVIDER: process.env.LLM_PROVIDER,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODERATION_MODEL: process.env.OPENAI_MODERATION_MODEL,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
  ADMIN_ACCESS_PASSWORD: process.env.ADMIN_ACCESS_PASSWORD,
  ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
  SUBMISSION_REVIEW_EMAIL: process.env.SUBMISSION_REVIEW_EMAIL,
});
