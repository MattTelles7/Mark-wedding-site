"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearAdminSession,
  createAdminSession,
  requireAdmin,
  verifyAdminPassword,
} from "@/lib/auth";
import {
  createGuest,
  createHousehold,
  deleteGuest,
  deleteHousehold,
  setHouseholdLocked,
  setRsvpsOpen,
  updateGuest,
  updateHousehold,
  type GuestStatus,
} from "@/lib/database";
import { rateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request";

export type LoginFormState = {
  message?: string;
};

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function positiveId(formData: FormData, name: string) {
  const id = Number(text(formData, name));
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function validLength(value: string, minimum: number, maximum: number) {
  return value.length >= minimum && value.length <= maximum;
}

function guestStatus(value: string): GuestStatus | null {
  return ["pending", "attending", "declined"].includes(value)
    ? (value as GuestStatus)
    : null;
}

function revalidateRsvpViews() {
  revalidatePath("/admin");
  revalidatePath("/rsvp");
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

export async function addHousehold(formData: FormData) {
  await requireAdmin();

  const householdName = text(formData, "householdName");
  const searchLastName = text(formData, "searchLastName");
  const contactEmail = text(formData, "contactEmail");
  const contactPhone = text(formData, "contactPhone");

  if (
    !validLength(householdName, 2, 120) ||
    !validLength(searchLastName, 2, 80) ||
    contactEmail.length > 180 ||
    contactPhone.length > 40
  ) {
    return;
  }

  createHousehold({
    householdName,
    searchLastName,
    contactEmail,
    contactPhone,
  });
  revalidateRsvpViews();
}

export async function editHousehold(formData: FormData) {
  await requireAdmin();

  const id = positiveId(formData, "householdId");
  const householdName = text(formData, "householdName");
  const searchLastName = text(formData, "searchLastName");
  const contactEmail = text(formData, "contactEmail");
  const contactPhone = text(formData, "contactPhone");

  if (
    !id ||
    !validLength(householdName, 2, 120) ||
    !validLength(searchLastName, 2, 80) ||
    contactEmail.length > 180 ||
    contactPhone.length > 40
  ) {
    return;
  }

  updateHousehold(id, {
    householdName,
    searchLastName,
    contactEmail,
    contactPhone,
  });
  revalidateRsvpViews();
}

export async function removeHousehold(formData: FormData) {
  await requireAdmin();
  const id = positiveId(formData, "householdId");
  if (!id) {
    return;
  }

  deleteHousehold(id);
  revalidateRsvpViews();
}

export async function addInvitedGuest(formData: FormData) {
  await requireAdmin();

  const householdId = positiveId(formData, "householdId");
  const firstName = text(formData, "firstName");
  const lastName = text(formData, "lastName");
  const notes = text(formData, "notes");

  if (
    !householdId ||
    !validLength(firstName, 1, 80) ||
    !validLength(lastName, 1, 80) ||
    notes.length > 500
  ) {
    return;
  }

  createGuest(householdId, { firstName, lastName, notes });
  revalidateRsvpViews();
}

export async function editInvitedGuest(formData: FormData) {
  await requireAdmin();

  const guestId = positiveId(formData, "guestId");
  const firstName = text(formData, "firstName");
  const lastName = text(formData, "lastName");
  const status = guestStatus(text(formData, "status"));
  const notes = text(formData, "notes");

  if (
    !guestId ||
    !status ||
    !validLength(firstName, 1, 80) ||
    !validLength(lastName, 1, 80) ||
    notes.length > 500
  ) {
    return;
  }

  updateGuest(guestId, { firstName, lastName, status, notes });
  revalidateRsvpViews();
}

export async function removeInvitedGuest(formData: FormData) {
  await requireAdmin();
  const guestId = positiveId(formData, "guestId");
  if (!guestId) {
    return;
  }

  deleteGuest(guestId);
  revalidateRsvpViews();
}

export async function changeHouseholdLock(formData: FormData) {
  await requireAdmin();
  const householdId = positiveId(formData, "householdId");
  if (!householdId) {
    return;
  }

  setHouseholdLocked(householdId, text(formData, "locked") === "true");
  revalidateRsvpViews();
}
