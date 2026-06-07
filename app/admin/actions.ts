"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearAdminSession,
  createAdminSession,
  requireAdmin,
  verifyAdminPassword,
} from "@/lib/auth";
import { deleteRsvp } from "@/lib/database";
import { rateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request";

export type LoginFormState = {
  message?: string;
};

export async function login(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const ip = await getRequestIp();
  const limit = rateLimit({
    key: `admin-login:${ip}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });

  if (!limit.allowed) {
    return {
      message: `Too many login attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`,
    };
  }

  const password = String(formData.get("password") ?? "");
  if (!verifyAdminPassword(password)) {
    return { message: "The password is incorrect." };
  }

  await createAdminSession();
  redirect("/admin");
}

export async function logout() {
  await clearAdminSession();
  redirect("/admin/login");
}

export async function removeRsvp(formData: FormData) {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) {
    return;
  }

  deleteRsvp(id);
  revalidatePath("/admin");
}
