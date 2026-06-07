"use server";

import { redirect } from "next/navigation";
import { insertRsvp } from "@/lib/database";
import { getRequestIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { validateRsvpForm } from "@/lib/validation";

export type RsvpFormState = {
  message?: string;
  errors?: Record<string, string>;
};

export async function submitRsvp(
  _previousState: RsvpFormState,
  formData: FormData,
): Promise<RsvpFormState> {
  const result = validateRsvpForm(formData);

  if (result.isHoneypot) {
    redirect("/rsvp/success");
  }

  if (!result.success) {
    return {
      message: "Please review the highlighted fields.",
      errors: result.errors,
    };
  }

  const ip = await getRequestIp();
  const limit = rateLimit({
    key: `rsvp:${ip}`,
    limit: 3,
    windowMs: 15 * 60 * 1000,
  });

  if (!limit.allowed) {
    return {
      message: `Too many RSVP attempts. Please try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`,
    };
  }

  insertRsvp(result.data);
  redirect("/rsvp/success");
}
