import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const dbOk = await checkDatabaseConnection();

  if (!dbOk) {
    return NextResponse.json(
      { status: "error", database: "unreachable" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  return NextResponse.json(
    { status: "ok", database: "ok" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
