import { cookies } from "next/headers";
import { timingSafeEqual } from "crypto";

const SESSION_COOKIE = "clawdashboard_session";

export function verifyPassword(password: string): boolean {
  const expected = process.env.AUTH_PASSWORD;
  if (!expected) return true;

  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function createSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, process.env.AUTH_SECRET ?? "dev", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  if (!process.env.AUTH_PASSWORD) return true;
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  return session === (process.env.AUTH_SECRET ?? "dev");
}

export function verifyWebhookSecret(header: string | null): boolean {
  const expected = process.env.OPENCLAW_WEBHOOK_SECRET;
  if (!expected) return true;
  if (!header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
