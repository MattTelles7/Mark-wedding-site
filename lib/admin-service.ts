import {
  type AdminFieldErrors,
  type AdminGuestInput,
  type AdminHouseholdCreationInput,
  type AdminHouseholdDetailsInput,
  type AdminGuestStatus,
  validateHouseholdDetails,
  validateInvitedGuest,
  validateNewHousehold,
} from "./admin-validation";

export type AdminMutationResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string; fieldErrors?: AdminFieldErrors };

type SavedGuest = {
  firstName: string;
  lastName: string;
  status: AdminGuestStatus;
  notes: string;
};

export type AdminHouseholdRepository = {
  createHouseholdWithGuests(input: {
    householdName: string;
    searchLastName: string;
    contactEmail: string;
    contactPhone: string;
    guests: SavedGuest[];
  }): Promise<number>;
  updateHousehold(
    householdId: number,
    input: {
      householdName: string;
      searchLastName: string;
      contactEmail: string;
      contactPhone: string;
    },
  ): Promise<boolean>;
  createGuest(householdId: number, input: SavedGuest): Promise<number>;
  updateGuest(guestId: number, input: SavedGuest): Promise<boolean>;
};

export async function createAdminHousehold(
  repository: AdminHouseholdRepository,
  input: AdminHouseholdCreationInput,
): Promise<AdminMutationResult<{ householdId: number }>> {
  const validation = validateNewHousehold(input);
  if (!validation.ok) {
    return {
      success: false,
      message: "Fix the highlighted fields before creating this household.",
      fieldErrors: validation.errors,
    };
  }

  const householdId = await repository.createHouseholdWithGuests(
    validation.value,
  );
  return { success: true, data: { householdId } };
}

export async function saveAdminHousehold(
  repository: AdminHouseholdRepository,
  input: AdminHouseholdDetailsInput & { id: number },
): Promise<
  AdminMutationResult<{
    searchLastName: string;
    householdName: string;
    contactEmail: string;
    contactPhone: string;
  }>
> {
  const validation = validateHouseholdDetails(input);
  if (!validation.ok) {
    return {
      success: false,
      message: "This household was not saved.",
      fieldErrors: validation.errors,
    };
  }

  const saved = await repository.updateHousehold(input.id, validation.value);
  if (!saved) {
    return { success: false, message: "This household no longer exists." };
  }

  return {
    success: true,
    data: {
      searchLastName: validation.value.searchLastName,
      householdName: validation.value.householdName,
      contactEmail: validation.value.contactEmail,
      contactPhone: validation.value.contactPhone,
    },
  };
}

export async function createAdminGuest(
  repository: AdminHouseholdRepository,
  householdId: number,
  input: AdminGuestInput,
): Promise<AdminMutationResult<{ guestId: number } & SavedGuest>> {
  const validation = validateInvitedGuest(input);
  if (!validation.ok) {
    return {
      success: false,
      message: "This person was not added.",
      fieldErrors: validation.errors,
    };
  }

  const guestId = await repository.createGuest(householdId, validation.value);
  return { success: true, data: { guestId, ...validation.value } };
}

export async function saveAdminGuest(
  repository: AdminHouseholdRepository,
  guestId: number,
  input: AdminGuestInput,
): Promise<AdminMutationResult<SavedGuest>> {
  const validation = validateInvitedGuest(input);
  if (!validation.ok) {
    return {
      success: false,
      message: "This person was not saved.",
      fieldErrors: validation.errors,
    };
  }

  const saved = await repository.updateGuest(guestId, validation.value);
  if (!saved) {
    return { success: false, message: "This person no longer exists." };
  }

  return { success: true, data: validation.value };
}
