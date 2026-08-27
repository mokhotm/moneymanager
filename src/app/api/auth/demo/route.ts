import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Demo authentication is disabled. Use real user credentials.",
    },
    { status: 410 }
  );
}
