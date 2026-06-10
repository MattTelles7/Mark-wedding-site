import { NextRequest, NextResponse } from "next/server";
import { isAdminSessionValid } from "@/lib/auth";
import {
  createGuestImportTemplateBuffer,
  GUEST_IMPORT_TEMPLATE_FILENAME,
  XLSX_CONTENT_TYPE,
} from "@/lib/import-template";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!(await isAdminSessionValid())) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const buffer = await createGuestImportTemplateBuffer();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="${GUEST_IMPORT_TEMPLATE_FILENAME}"`,
      "Cache-Control": "no-store",
    },
  });
}
