"use server";

import { cookies } from "next/headers";
import type { AuthResponse, User } from "../types/auth.types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/users";
const SESSION_COOKIE = "session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

async function persistSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function loginAction(email: string, password: string): Promise<AuthResponse> {
  try {
    const res = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok || !data.success || !data.user || !data.token) {
      return { success: false, error: data.error ?? "Échec de la connexion" };
    }

    await persistSessionCookie(data.token);

    return { success: true, user: data.user };
  } catch (error) {
    console.error("Erreur de connexion:", error);
    return { success: false, error: error instanceof Error ? error.message : "Erreur inconnue" };
  }
}

export async function registerAction(userData: Record<string, unknown>): Promise<AuthResponse> {
  try {
    const res = await fetch(`${BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    const data = await res.json();

    if (!res.ok || !data.success || !data.user || !data.token) {
      return { success: false, error: data.error ?? "Échec de l'inscription" };
    }

    await persistSessionCookie(data.token);

    return { success: true, user: data.user };
  } catch (error) {
    console.error("Erreur d'inscription:", error);
    return { success: false, error: error instanceof Error ? error.message : "Erreur inconnue" };
  }
}

export async function getCurrentUserAction(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const res = await fetch(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      cookieStore.delete(SESSION_COOKIE);
      return null;
    }

    const data = await res.json();
    return data.user ?? null;
  } catch (error) {
    console.error("Erreur récupération utilisateur:", error);
    return null;
  }
}

export async function logoutAction(): Promise<AuthResponse> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return { success: true, message: "Déconnexion réussie" };
}

export async function getSocketTokenAction(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}