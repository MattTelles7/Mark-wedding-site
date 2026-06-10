"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  fileToImportBuffer,
  parseGuestImportWorkbook,
} from "@/lib/import-parser";
import { importValidGuestRows, previewGuestImport } from "@/lib/import-service";
import type { GuestImportActionResult } from "@/lib/import-types";

function revalidateRsvpViews() {
  revalidatePath("/admin");
  revalidatePath("/rsvp");
}

function getUploadedFile(formData: FormData): File | undefined {
  const value = formData.get("file");
  return value instanceof File ? value : undefined;
}

async function parseUpload(formData: FormData) {
  const file = getUploadedFile(formData);
  if (!file) {
    throw new Error("Upload a completed .xlsx template before previewing.");
  }
  return parseGuestImportWorkbook(await fileToImportBuffer(file));
}

function importFailure(error: unknown): GuestImportActionResult {
  const message =
    error instanceof Error
      ? error.message
      : "Import failed. Check the file and try again.";
  const expectedUploadError =
    message.startsWith("Upload ") || message.startsWith("The uploaded file ");

  if (!expectedUploadError) {
    console.error("Admin guest import failed", error);
  }

  return {
    success: false,
    message,
  };
}

export async function previewGuestImportAction(
  formData: FormData,
): Promise<GuestImportActionResult> {
  await requireAdmin();

  try {
    return await previewGuestImport(await parseUpload(formData));
  } catch (error) {
    return importFailure(error);
  }
}

export async function importValidGuestRowsAction(
  formData: FormData,
): Promise<GuestImportActionResult> {
  await requireAdmin();

  try {
    const result = await importValidGuestRows(await parseUpload(formData));
    if (result.success) {
      revalidateRsvpViews();
    }
    return result;
  } catch (error) {
    return importFailure(error);
  }
}
