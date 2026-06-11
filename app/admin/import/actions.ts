"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  fileToImportBuffer,
  parseGuestImportWorkbook,
  type ImportUploadFile,
} from "@/lib/import-parser";
import { importValidGuestRows, previewGuestImport } from "@/lib/import-service";
import type { GuestImportActionResult } from "@/lib/import-types";

type UploadDiagnostics = {
  fileName: string;
  fileSize: number;
  mimeType: string;
};

function revalidateRsvpViews() {
  revalidatePath("/admin");
  revalidatePath("/rsvp");
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof value.arrayBuffer === "function" &&
    "name" in value &&
    typeof value.name === "string" &&
    "size" in value &&
    typeof value.size === "number"
  );
}

function getUploadedFile(formData: FormData): ImportUploadFile | undefined {
  const value = formData.get("file");
  return isUploadedFile(value) ? value : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function logUploadStage(
  diagnostics: UploadDiagnostics,
  parseStage: string,
  error?: unknown,
) {
  const details = { ...diagnostics, parseStage };
  if (error === undefined) {
    console.info("Admin guest import upload", details);
    return;
  }
  console.error("Admin guest import upload failed", {
    ...details,
    error: errorMessage(error),
  });
}

async function parseUpload(formData: FormData) {
  const file = getUploadedFile(formData);
  if (!file) {
    throw new Error("Upload a completed .xlsx template before previewing.");
  }
  const diagnostics = {
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || "unknown",
  };

  logUploadStage(diagnostics, "received");
  let buffer: Buffer;
  try {
    buffer = await fileToImportBuffer(file);
  } catch (error) {
    logUploadStage(diagnostics, "buffer-create", error);
    throw error;
  }
  logUploadStage(diagnostics, "buffer-created");

  const parsed = await parseGuestImportWorkbook(buffer, {
    onWorkbookReadError(error) {
      logUploadStage(diagnostics, "workbook-read", error);
    },
  });
  if (!parsed.fatalError) {
    logUploadStage(diagnostics, "workbook-parsed");
  }
  return parsed;
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
