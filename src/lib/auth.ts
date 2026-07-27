import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { env } from './env';

const cookieName = 'nyc-demolition-admin';

function signature(value: string) {
  if (!env.ADMIN_SESSION_SECRET) return '';
  return createHmac('sha256', env.ADMIN_SESSION_SECRET).update(value).digest('hex');
}

export function passwordMatches(password: string) {
  if (!env.ADMIN_ACCESS_PASSWORD) return false;
  const expected = Buffer.from(env.ADMIN_ACCESS_PASSWORD);
  const received = Buffer.from(password);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function isAdmin() {
  const value = (await cookies()).get(cookieName)?.value;
  const expected = signature('admin');
  return Boolean(value && expected && value.length === expected.length && timingSafeEqual(Buffer.from(value), Buffer.from(expected)));
}

export async function setAdminSession() {
  (await cookies()).set(cookieName, signature('admin'), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 8 });
}

export async function clearAdminSession() {
  (await cookies()).delete(cookieName);
}
