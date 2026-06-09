import { afterEach, describe, expect, it } from "vitest";
import { verifyAdminPassword } from "./auth";

const originalAdminPassword = process.env.ADMIN_PASSWORD;

afterEach(() => {
  if (originalAdminPassword === undefined) {
    delete process.env.ADMIN_PASSWORD;
  } else {
    process.env.ADMIN_PASSWORD = originalAdminPassword;
  }
});

describe("verifyAdminPassword", () => {
  it("accepts the documented local test password", () => {
    process.env.ADMIN_PASSWORD = "admin";

    expect(verifyAdminPassword("admin")).toBe(true);
  });

  it("rejects missing or incorrect passwords", () => {
    delete process.env.ADMIN_PASSWORD;
    expect(verifyAdminPassword("admin")).toBe(false);

    process.env.ADMIN_PASSWORD = "admin";
    expect(verifyAdminPassword("wrong")).toBe(false);
  });
});
