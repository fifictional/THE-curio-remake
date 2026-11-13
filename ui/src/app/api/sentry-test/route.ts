import { NextResponse } from "next/server";

/**
 * Dev/staging only: triggers a server-side error for Sentry verification.
 * Remove or protect if you do not want this route in production.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("throw") !== "1") {
    return NextResponse.json(
      {
        ok: true,
        hint: 'Add ?throw=1 to trigger a test error (non-production builds only).',
      },
      { status: 200 },
    );
  }

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  throw new Error("Sentry server test error (Next.js route handler)");
}
