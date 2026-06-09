export const ADMIN_GUEST_STATUSES = [
  "attending",
  "declined",
  "pending",
] as const;

export type AdminGuestStatus = (typeof ADMIN_GUEST_STATUSES)[number];

export type AdminGuestInput = {
  firstName: string;
  lastName: string;
  status?: string;
  notes?: string;
};

export type AdminHouseholdDetailsInput = {
  id?: number;
  searchLastName: string;
  householdName: string;
  contactEmail?: string;
  contactPhone?: string;
};

export type AdminHouseholdCreationInput = AdminHouseholdDetailsInput & {
  guests: AdminGuestInput[];
};

export type AdminFieldErrors = Record<string, string>;

export type AdminValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: AdminFieldErrors };

export type HouseholdNameDraft = {
  searchLastName: string;
  householdName: string;
  householdNameManuallyEdited: boolean;
};

let guestDraftSequence = 0;

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isGuestStatus(value: string): value is AdminGuestStatus {
  return ADMIN_GUEST_STATUSES.includes(value as AdminGuestStatus);
}

export function suggestedHouseholdName(lastName: string): string {
  const normalizedLastName = normalizeText(lastName).slice(0, 80);
  return normalizedLastName
    ? `The ${normalizedLastName} Family`.slice(0, 120)
    : "";
}

export function updateHouseholdLastName(
  draft: HouseholdNameDraft,
  searchLastName: string,
): HouseholdNameDraft {
  return {
    ...draft,
    searchLastName,
    householdName: draft.householdNameManuallyEdited
      ? draft.householdName
      : suggestedHouseholdName(searchLastName),
  };
}

export function updateHouseholdName(
  draft: HouseholdNameDraft,
  householdName: string,
): HouseholdNameDraft {
  return {
    ...draft,
    householdName,
    householdNameManuallyEdited: true,
  };
}

export function defaultGuestLastName(
  householdLastName: string,
  guests: Array<Pick<AdminGuestInput, "lastName">>,
): string {
  const normalizedHouseholdLastName = normalizeText(householdLastName).slice(
    0,
    80,
  );
  if (normalizedHouseholdLastName) {
    return normalizedHouseholdLastName;
  }

  return normalizeText(guests[0]?.lastName).slice(0, 80);
}

export function householdStatusLabel(isLocked: boolean): string {
  return isLocked ? "Submitted and Closed" : "Open for Submission";
}

export function householdStatusActionLabel(isLocked: boolean): string {
  return isLocked ? "Reopen for Submission" : "Mark as Submitted and Closed";
}

export function nextGuestDraftKey(): string {
  guestDraftSequence += 1;
  return `guest-draft-${guestDraftSequence}`;
}

export function mergeSavedFields<T extends Record<string, string>>(
  current: T,
  submitted: T,
  saved: T,
): { value: T; hasNewerChanges: boolean } {
  const value = Object.fromEntries(
    Object.keys(saved).map((field) => [
      field,
      current[field] === submitted[field] ? saved[field] : current[field],
    ]),
  ) as T;

  return {
    value,
    hasNewerChanges: Object.keys(saved).some(
      (field) => value[field] !== saved[field],
    ),
  };
}

export function validateHouseholdDetails(
  input: AdminHouseholdDetailsInput,
): AdminValidationResult<{
  id?: number;
  searchLastName: string;
  householdName: string;
  contactEmail: string;
  contactPhone: string;
}> {
  const value = {
    id: input.id,
    searchLastName: normalizeText(input.searchLastName),
    householdName: normalizeText(input.householdName),
    contactEmail: normalizeText(input.contactEmail),
    contactPhone: normalizeText(input.contactPhone),
  };
  const errors: AdminFieldErrors = {};

  if (!value.searchLastName) {
    errors.searchLastName = "Last Name is required.";
  } else if (value.searchLastName.length < 2) {
    errors.searchLastName = "Last Name must be at least 2 characters.";
  } else if (value.searchLastName.length > 80) {
    errors.searchLastName = "Last Name must be 80 characters or fewer.";
  }
  if (!value.householdName) {
    errors.householdName = "Household Name is required.";
  } else if (value.householdName.length < 2) {
    errors.householdName = "Household Name must be at least 2 characters.";
  } else if (value.householdName.length > 120) {
    errors.householdName = "Household Name must be 120 characters or fewer.";
  }
  if (value.contactEmail.length > 180) {
    errors.contactEmail = "Contact Email must be 180 characters or fewer.";
  } else if (value.contactEmail && !isValidEmail(value.contactEmail)) {
    errors.contactEmail = "Enter a valid email address.";
  }
  if (value.contactPhone.length > 80) {
    errors.contactPhone = "Contact Phone must be 80 characters or fewer.";
  }

  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, value };
}

export function validateInvitedGuest(
  input: AdminGuestInput,
): AdminValidationResult<{
  firstName: string;
  lastName: string;
  status: AdminGuestStatus;
  notes: string;
}> {
  const requestedStatus = normalizeText(input.status || "pending");
  const value = {
    firstName: normalizeText(input.firstName),
    lastName: normalizeText(input.lastName),
    status: isGuestStatus(requestedStatus) ? requestedStatus : "pending",
    notes: normalizeText(input.notes),
  };
  const errors: AdminFieldErrors = {};

  if (!value.firstName) {
    errors.firstName = "First Name is required.";
  } else if (value.firstName.length > 80) {
    errors.firstName = "First Name must be 80 characters or fewer.";
  }
  if (!value.lastName) {
    errors.lastName = "Last Name is required.";
  } else if (value.lastName.length > 80) {
    errors.lastName = "Last Name must be 80 characters or fewer.";
  }
  if (!isGuestStatus(requestedStatus)) {
    errors.status = "Choose a valid RSVP status.";
  }
  if (value.notes.length > 2000) {
    errors.notes = "Admin Notes must be 2,000 characters or fewer.";
  }

  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, value };
}

export function validateNewHousehold(
  input: AdminHouseholdCreationInput,
): AdminValidationResult<{
  id?: number;
  searchLastName: string;
  householdName: string;
  contactEmail: string;
  contactPhone: string;
  guests: Array<{
    firstName: string;
    lastName: string;
    status: AdminGuestStatus;
    notes: string;
  }>;
}> {
  const household = validateHouseholdDetails(input);
  const errors: AdminFieldErrors = household.ok ? {} : { ...household.errors };
  const guests = Array.isArray(input.guests) ? input.guests : [];
  const normalizedGuests: Array<{
    firstName: string;
    lastName: string;
    status: AdminGuestStatus;
    notes: string;
  }> = [];

  if (guests.length === 0) {
    errors.guests = "Add at least one invited person.";
  }

  guests.forEach((guest, index) => {
    const result = validateInvitedGuest(guest);
    if (result.ok) {
      normalizedGuests.push(result.value);
      return;
    }

    Object.entries(result.errors).forEach(([field, message]) => {
      errors[`guests.${index}.${field}`] = message;
    });
  });

  if (Object.keys(errors).length || !household.ok) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      ...household.value,
      guests: normalizedGuests,
    },
  };
}
