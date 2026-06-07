import { NextRequest, NextResponse } from "next/server";
import { isAdminSessionValid } from "@/lib/auth";
import { getRsvps } from "@/lib/database";
import { rsvpsToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!(await isAdminSessionValid())) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const csv = rsvpsToCsv(getRsvps());
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wedding-rsvps-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
