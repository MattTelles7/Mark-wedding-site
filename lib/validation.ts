const householdStatuses = ["attending", "declined"] as const;

type HouseholdSearchValidation =
  | { success: true; isHoneypot: false; lastName: string }
  | { success: false; isHoneypot: false; message: string }
  | { success: false; isHoneypot: true; message: "" };

type HouseholdConfirmationValidation =
  | {
      success: true;
      isHoneypot: false;
      householdId: number;
      responses: Array<{
        guestId: number;
        status: (typeof householdStatuses)[number];
      }>;
    }
  | { success: false; isHoneypot: false; message: string }
  | { success: false; isHoneypot: true; message: "" };

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export function validateHouseholdSearch(
  formData: FormData,
): HouseholdSearchValidation {
  if (text(formData, "website")) {
    return { success: false, isHoneypot: true, message: "" };
  }

  const lastName = text(formData, "lastName").replace(/\s+/g, " ");
  if (lastName.length < 2 || lastName.length > 80) {
    return {
      success: false,
      isHoneypot: false,
      message: "Enter the last name from your invitation.",
    };
  }

  return { success: true, isHoneypot: false, lastName };
}

export function validateHouseholdConfirmation(
  formData: FormData,
): HouseholdConfirmationValidation {
  if (text(formData, "website")) {
    return { success: false, isHoneypot: true, message: "" };
  }

  const householdId = Number(text(formData, "householdId"));
  if (!Number.isSafeInteger(householdId) || householdId <= 0) {
    return {
      success: false,
      isHoneypot: false,
      message: "We could not identify that household. Please search again.",
    };
  }

  const responses: Array<{
    guestId: number;
    status: (typeof householdStatuses)[number];
  }> = [];

  for (const [name, value] of formData.entries()) {
    if (!name.startsWith("guest-")) {
      continue;
    }

    const guestId = Number(name.slice("guest-".length));
    const status = String(value);
    if (
      !Number.isSafeInteger(guestId) ||
      guestId <= 0 ||
      !householdStatuses.includes(status as (typeof householdStatuses)[number])
    ) {
      return {
        success: false,
        isHoneypot: false,
        message: "Choose attending or declined for every invited person.",
      };
    }

    responses.push({
      guestId,
      status: status as (typeof householdStatuses)[number],
    });
  }

  if (responses.length === 0) {
    return {
      success: false,
      isHoneypot: false,
      message: "Choose attending or declined for every invited person.",
    };
  }

  if (text(formData, "confirmFinal") !== "yes") {
    return {
      success: false,
      isHoneypot: false,
      message: "Confirm that you understand this response will be final.",
    };
  }

  return {
    success: true,
    isHoneypot: false,
    householdId,
    responses,
  };
}
