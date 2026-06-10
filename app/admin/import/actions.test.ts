import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(async () => undefined),
}));

import { requireAdmin } from "@/lib/auth";
import { previewGuestImportAction } from "./actions";

describe("admin import actions", () => {
  beforeEach(() => {
    vi.mocked(requireAdmin).mockReset();
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
  });

  it("rejects non-admin access before reading upload data", async () => {
    vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("redirect"));

    await expect(previewGuestImportAction(new FormData())).rejects.toThrow(
      "redirect",
    );
  });

  it("rejects non-xlsx uploads cleanly", async () => {
    const formData = new FormData();
    formData.set("file", new File(["last,first"], "guests.csv"));

    const result = await previewGuestImportAction(formData);

    expect(result).toEqual({
      success: false,
      message: "Upload a .xlsx file using the completed template.",
    });
  });
});
