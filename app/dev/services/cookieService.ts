"use server";

import { cookies } from "next/headers";
import { sign, verify } from "../utils/hashage";

const SESSION_COOKIE = "session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

export async function setSession(userId: string) {
  const cookieStore = await cookies();
  const signedValue = sign(userId);

  cookieStore.set(SESSION_COOKIE, signedValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function getSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const rawValue = cookieStore.get(SESSION_COOKIE)?.value;

  if (!rawValue) return null;

  const userId = verify(rawValue);

  if (!userId) {
    return null;
  }

  return userId;
}

export async function removeSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function hasSession(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}