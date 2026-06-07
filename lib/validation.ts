const mealChoices = ["chicken", "beef", "vegetarian", "vegan", "kids"] as const;

export type RsvpInput = {
  fullName: string;
  attending: boolean;
  guestCount: number;
  mealChoice: (typeof mealChoices)[number] | "not_applicable";
  songRequest: string;
  message: string;
};

type ValidationResult =
  | { success: true; isHoneypot: false; data: RsvpInput }
  | {
      success: false;
      isHoneypot: false;
      errors: Record<string, string>;
    }
  | { success: false; isHoneypot: true; errors: Record<string, never> };

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export function validateRsvpForm(formData: FormData): ValidationResult {
  if (text(formData, "website")) {
    return { success: false, isHoneypot: true, errors: {} };
  }

  const errors: Record<string, string> = {};
  const fullName = text(formData, "fullName");
  const attendingValue = text(formData, "attending");
  const attending = attendingValue === "yes";
  const rawGuestCount = text(formData, "guestCount");
  const guestCount = Number(rawGuestCount);
  const rawMealChoice = text(formData, "mealChoice");
  const songRequest = text(formData, "songRequest");
  const message = text(formData, "message");

  if (fullName.length < 2 || fullName.length > 120) {
    errors.fullName = "Enter a name between 2 and 120 characters.";
  }

  if (!["yes", "no"].includes(attendingValue)) {
    errors.attending = "Choose whether you will attend.";
  }

  if (
    attending &&
    (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 10)
  ) {
    errors.guestCount = "Enter a guest count between 1 and 10.";
  }

  if (
    attending &&
    !mealChoices.includes(rawMealChoice as (typeof mealChoices)[number])
  ) {
    errors.mealChoice = "Choose a meal option.";
  }

  if (songRequest.length > 120) {
    errors.songRequest = "Keep the song request under 120 characters.";
  }

  if (message.length > 600) {
    errors.message = "Keep the message under 600 characters.";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, isHoneypot: false, errors };
  }

  return {
    success: true,
    isHoneypot: false,
    data: {
      fullName,
      attending,
      guestCount: attending ? guestCount : 0,
      mealChoice: attending
        ? (rawMealChoice as (typeof mealChoices)[number])
        : "not_applicable",
      songRequest,
      message,
    },
  };
}
