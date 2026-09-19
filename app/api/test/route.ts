import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const BASE_URL = "http://localhost:3001/api/users";
const SESSION_COOKIE = "session";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    const users = await fetch(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur",
      },
      { status: 500 },
    );
  }
}
