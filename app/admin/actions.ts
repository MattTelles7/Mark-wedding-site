"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearAdminSession,
  createAdminSession,
  requireAdmin,
  verifyAdminPassword,
} from "../../lib/auth";
import {
  createHouseholdWithGuests,
  createGuest,
  deleteGuest,
  deleteHousehold,
  setHouseholdLocked,
  setRsvpsOpen,
  updateGuest,
  updateHousehold,
} from "../../lib/database";
import {
  createAdminGuest,
  createAdminHousehold,
  saveAdminGuest,
  saveAdminHousehold,
  type AdminMutationResult,
} from "../../lib/admin-service";
import type {
  AdminGuestInput,
  AdminHouseholdCreationInput,
  AdminHouseholdDetailsInput,
} from "../../lib/admin-validation";
import { rateLimit } from "../../lib/rate-limit";
import { getRequestIp } from "../../lib/request";

export type LoginFormState = {
  message?: string;
};

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function revalidateRsvpViews() {
  revalidatePath("/admin");
  revalidatePath("/rsvp");
}

const adminRepository = {
  createHouseholdWithGuests,
  updateHousehold,
  createGuest,
  updateGuest,
};

function invalidIdResult<T = undefined>(): AdminMutationResult<T> {
  return { success: false, message: "This item could not be found." };
}

function mutationFailure<T = undefined>(
  error: unknown,
): AdminMutationResult<T> {
  console.error("Admin RSVP mutation failed", error);
  return {
    success: false,
    message: "Not saved. Check the information and try again.",
  };
}

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

export async function toggleRsvps(formData: FormData) {
  await requireAdmin();
  setRsvpsOpen(text(formData, "open") === "true");
  revalidateRsvpViews();
}

export async function createHouseholdAction(
  input: AdminHouseholdCreationInput,
): Promise<AdminMutationResult<{ householdId: number }>> {
  await requireAdmin();

  try {
    const result = createAdminHousehold(adminRepository, input);
    if (result.success) {
      revalidateRsvpViews();
    }
    return result;
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function autosaveHouseholdAction(
  input: AdminHouseholdDetailsInput & { id: number },
): Promise<
  AdminMutationResult<{
    searchLastName: string;
    householdName: string;
    contactEmail: string;
    contactPhone: string;
  }>
> {
  await requireAdmin();

  if (!Number.isSafeInteger(input.id) || input.id <= 0) {
    return invalidIdResult();
  }

  try {
    const result = saveAdminHousehold(adminRepository, input);
    if (result.success) {
      revalidateRsvpViews();
    }
    return result;
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function removeHouseholdAction(
  householdId: number,
): Promise<AdminMutationResult> {
  await requireAdmin();
  if (!Number.isSafeInteger(householdId) || householdId <= 0) {
    return invalidIdResult();
  }

  try {
    deleteHousehold(householdId);
    revalidateRsvpViews();
    return { success: true, data: undefined };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function createGuestAction(
  householdId: number,
  input: AdminGuestInput,
): Promise<
  AdminMutationResult<{
    guestId: number;
    firstName: string;
    lastName: string;
    status: "pending" | "attending" | "declined";
    notes: string;
  }>
> {
  await requireAdmin();

  if (!Number.isSafeInteger(householdId) || householdId <= 0) {
    return invalidIdResult();
  }

  try {
    const result = createAdminGuest(adminRepository, householdId, input);
    if (result.success) {
      revalidateRsvpViews();
    }
    return result;
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function autosaveGuestAction(
  guestId: number,
  input: AdminGuestInput,
): Promise<
  AdminMutationResult<{
    firstName: string;
    lastName: string;
    status: "pending" | "attending" | "declined";
    notes: string;
  }>
> {
  await requireAdmin();

  if (!Number.isSafeInteger(guestId) || guestId <= 0) {
    return invalidIdResult();
  }

  try {
    const result = saveAdminGuest(adminRepository, guestId, input);
    if (result.success) {
      revalidateRsvpViews();
    }
    return result;
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function removeGuestAction(
  guestId: number,
): Promise<AdminMutationResult> {
  await requireAdmin();
  if (!Number.isSafeInteger(guestId) || guestId <= 0) {
    return invalidIdResult();
  }

  try {
    const removed = deleteGuest(guestId);
    if (!removed) {
      return {
        success: false,
        message:
          "A household must keep at least one invited person. Delete the household instead.",
      };
    }
    revalidateRsvpViews();
    return { success: true, data: undefined };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function setHouseholdSubmissionAction(
  householdId: number,
  isLocked: boolean,
): Promise<AdminMutationResult> {
  await requireAdmin();
  if (!Number.isSafeInteger(householdId) || householdId <= 0) {
    return invalidIdResult();
  }

  try {
    setHouseholdLocked(householdId, isLocked);
    revalidateRsvpViews();
    return { success: true, data: undefined };
  } catch (error) {
    return mutationFailure(error);
  }
}
