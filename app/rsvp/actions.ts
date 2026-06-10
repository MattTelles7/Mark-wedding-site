"use server";

import { redirect } from "next/navigation";
import {
  areRsvpsOpen,
  confirmHousehold,
  searchPublicHouseholds,
  type PublicHousehold,
} from "@/lib/database";
import { getRequestIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import {
  validateHouseholdConfirmation,
  validateHouseholdSearch,
} from "@/lib/validation";

export type HouseholdSearchState = {
  message?: string;
  households?: PublicHousehold[];
  searchedLastName?: string;
};

export type HouseholdResponseState = {
  message?: string;
};

export async function searchHouseholds(
  _previousState: HouseholdSearchState,
  formData: FormData,
): Promise<HouseholdSearchState> {
  const validation = validateHouseholdSearch(formData);
  if (validation.isHoneypot) {
    return { households: [] };
  }

  if (!validation.success) {
    return { message: validation.message };
  }

  const ip = await getRequestIp();
  const limit = rateLimit({
    key: `rsvp-search:${ip}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });

  if (!limit.allowed) {
    return {
      message: `Too many searches. Please try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`,
    };
  }

  if (!(await areRsvpsOpen())) {
    return { message: "RSVPs are not open right now." };
  }

  const households = await searchPublicHouseholds(validation.lastName);
  return {
    households,
    searchedLastName: validation.lastName,
    message:
      households.length === 0
        ? "We could not find an invitation under that last name. Check the spelling or contact the host."
        : undefined,
  };
}

export async function submitHouseholdRsvp(
  _previousState: HouseholdResponseState,
  formData: FormData,
): Promise<HouseholdResponseState> {
  const validation = validateHouseholdConfirmation(formData);

  if (validation.isHoneypot) {
    redirect("/rsvp/success");
  }

  if (!validation.success) {
    return { message: validation.message };
  }

  const ip = await getRequestIp();
  const limit = rateLimit({
    key: `rsvp-submit:${ip}`,
    limit: 3,
    windowMs: 15 * 60 * 1000,
  });

  if (!limit.allowed) {
    return {
      message: `Too many RSVP attempts. Please try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`,
    };
  }

  const result = await confirmHousehold(
    validation.householdId,
    validation.responses,
  );

  if (result.success) {
    redirect("/rsvp/success");
  }

  const messages = {
    closed: "RSVPs are not open right now.",
    not_found: "We could not find that household. Please search again.",
    locked:
      "This household has already submitted a response. Contact the host if a change is needed.",
    invalid_responses:
      "Choose attending or declined for every invited person before confirming.",
  } as const;

  return { message: messages[result.code] };
}
