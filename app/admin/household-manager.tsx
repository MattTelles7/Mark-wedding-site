"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  autosaveGuestAction,
  autosaveHouseholdAction,
  createGuestAction,
  createHouseholdAction,
  removeGuestAction,
  removeHouseholdAction,
  setHouseholdSubmissionAction,
} from "./actions";
import {
  defaultGuestLastName,
  householdStatusActionLabel,
  householdStatusLabel,
  mergeSavedFields,
  nextGuestDraftKey,
  updateHouseholdLastName,
  updateHouseholdName,
  validateHouseholdDetails,
  validateInvitedGuest,
  validateNewHousehold,
  type AdminFieldErrors,
  type AdminGuestStatus,
} from "@/lib/admin-validation";
import type { Household, InvitedGuest } from "@/lib/database";

type SaveState = "saved" | "saving" | "dirty" | "error";

type GuestDraft = {
  key: string;
  firstName: string;
  lastName: string;
  status: AdminGuestStatus;
  notes: string;
  lastNameManuallyEdited: boolean;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not submitted";
  }

  const normalized = value.includes("T")
    ? value
    : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function SaveIndicator({
  state,
  message,
}: {
  state: SaveState;
  message?: string;
}) {
  return (
    <span
      className={`admin-save-indicator admin-save-${state}`}
      role={state === "error" ? "alert" : "status"}
      aria-live="polite"
      title={message}
    >
      {state === "saving"
        ? "Saving"
        : state === "error" || state === "dirty"
          ? "Not saved"
          : "Saved"}
    </span>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <span className="admin-field-error">{message}</span> : null;
}

function newGuestDraft(lastName = "", key = nextGuestDraftKey()): GuestDraft {
  return {
    key,
    firstName: "",
    lastName,
    status: "pending",
    notes: "",
    lastNameManuallyEdited: false,
  };
}

function CreateHouseholdForm() {
  const router = useRouter();
  const [draft, setDraft] = useState({
    searchLastName: "",
    householdName: "",
    householdNameManuallyEdited: false,
    contactEmail: "",
    contactPhone: "",
  });
  const [guests, setGuests] = useState<GuestDraft[]>([
    newGuestDraft("", "primary"),
  ]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverErrors, setServerErrors] = useState<AdminFieldErrors>({});
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const input = useMemo(
    () => ({
      searchLastName: draft.searchLastName,
      householdName: draft.householdName,
      contactEmail: draft.contactEmail,
      contactPhone: draft.contactPhone,
      guests: guests.map(({ firstName, lastName, status, notes }) => ({
        firstName,
        lastName,
        status,
        notes,
      })),
    }),
    [draft, guests],
  );
  const validation = validateNewHousehold(input);
  const localErrors = validation.ok ? {} : validation.errors;

  function visibleError(name: string) {
    return (
      serverErrors[name] || (touched[name] ? localErrors[name] : undefined)
    );
  }

  function touch(name: string) {
    setTouched((current) => ({ ...current, [name]: true }));
  }

  function updateGuest(
    key: string,
    field: "firstName" | "lastName" | "notes",
    value: string,
  ) {
    setGuests((current) =>
      current.map((guest) =>
        guest.key === key
          ? {
              ...guest,
              [field]: value,
              ...(field === "lastName" ? { lastNameManuallyEdited: true } : {}),
            }
          : guest,
      ),
    );
    setServerErrors({});
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checked = validateNewHousehold(input);
    if (!checked.ok) {
      setTouched(
        Object.fromEntries(
          Object.keys(checked.errors).map((key) => [key, true]),
        ),
      );
      setMessage("Fix the highlighted fields before creating this household.");
      return;
    }

    setPending(true);
    setMessage("");
    setServerErrors({});
    let result;
    try {
      result = await createHouseholdAction(input);
    } catch {
      setPending(false);
      setMessage("Household not created. Check your connection and try again.");
      return;
    }
    setPending(false);
    if (!result.success) {
      setServerErrors(result.fieldErrors ?? {});
      setMessage(result.message);
      return;
    }

    setDraft({
      searchLastName: "",
      householdName: "",
      householdNameManuallyEdited: false,
      contactEmail: "",
      contactPhone: "",
    });
    setGuests([newGuestDraft("", "primary")]);
    setTouched({});
    setMessage("Household created.");
    router.refresh();
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <p className="eyebrow">Invitation list</p>
          <h2>Add a household</h2>
        </div>
        <p>
          Create the household and its first invited person together. No empty
          household will be saved.
        </p>
      </div>

      <form className="admin-create-household" onSubmit={submit} noValidate>
        <div className="admin-form-grid admin-household-fields">
          <label>
            Last Name
            <input
              value={draft.searchLastName}
              onChange={(event) => {
                const searchLastName = event.target.value;
                setDraft((current) => ({
                  ...current,
                  ...updateHouseholdLastName(current, searchLastName),
                }));
                setGuests((current) =>
                  current.map((guest) =>
                    guest.lastNameManuallyEdited
                      ? guest
                      : { ...guest, lastName: searchLastName },
                  ),
                );
                setServerErrors({});
              }}
              onBlur={() => touch("searchLastName")}
              maxLength={80}
              autoComplete="family-name"
              aria-invalid={Boolean(visibleError("searchLastName"))}
            />
            <FieldError message={visibleError("searchLastName")} />
          </label>
          <label>
            Household Name
            <input
              value={draft.householdName}
              onChange={(event) => {
                setDraft((current) => ({
                  ...current,
                  ...updateHouseholdName(current, event.target.value),
                }));
                setServerErrors({});
              }}
              onBlur={() => touch("householdName")}
              maxLength={120}
              placeholder="The Wolfe Family"
              aria-invalid={Boolean(visibleError("householdName"))}
            />
            <FieldError message={visibleError("householdName")} />
          </label>
          <label>
            Contact Email
            <input
              value={draft.contactEmail}
              onChange={(event) => {
                setDraft((current) => ({
                  ...current,
                  contactEmail: event.target.value,
                }));
                setServerErrors({});
              }}
              onBlur={() => touch("contactEmail")}
              type="email"
              maxLength={180}
              autoComplete="email"
              aria-invalid={Boolean(visibleError("contactEmail"))}
            />
            <FieldError message={visibleError("contactEmail")} />
          </label>
          <label>
            Contact Phone
            <input
              value={draft.contactPhone}
              onChange={(event) => {
                setDraft((current) => ({
                  ...current,
                  contactPhone: event.target.value,
                }));
                setServerErrors({});
              }}
              type="tel"
              maxLength={80}
              autoComplete="tel"
              onBlur={() => touch("contactPhone")}
              aria-invalid={Boolean(visibleError("contactPhone"))}
            />
            <FieldError message={visibleError("contactPhone")} />
          </label>
        </div>

        <div className="admin-new-household-guests">
          <div className="admin-subheading">
            <div>
              <h3>Invited people</h3>
              <p>At least one person is required.</p>
            </div>
          </div>
          {guests.map((guest, index) => (
            <div className="new-household-guest-row" key={guest.key}>
              <label>
                First Name
                <input
                  value={guest.firstName}
                  onChange={(event) =>
                    updateGuest(guest.key, "firstName", event.target.value)
                  }
                  onBlur={() => touch(`guests.${index}.firstName`)}
                  maxLength={80}
                  aria-invalid={Boolean(
                    visibleError(`guests.${index}.firstName`),
                  )}
                />
                <FieldError
                  message={visibleError(`guests.${index}.firstName`)}
                />
              </label>
              <label>
                Last Name
                <input
                  value={guest.lastName}
                  onChange={(event) =>
                    updateGuest(guest.key, "lastName", event.target.value)
                  }
                  onBlur={() => touch(`guests.${index}.lastName`)}
                  maxLength={80}
                  aria-invalid={Boolean(
                    visibleError(`guests.${index}.lastName`),
                  )}
                />
                <FieldError
                  message={visibleError(`guests.${index}.lastName`)}
                />
              </label>
              <label>
                Admin Notes
                <input
                  value={guest.notes}
                  onChange={(event) =>
                    updateGuest(guest.key, "notes", event.target.value)
                  }
                  onBlur={() => touch(`guests.${index}.notes`)}
                  maxLength={2000}
                  aria-invalid={Boolean(visibleError(`guests.${index}.notes`))}
                />
                <FieldError message={visibleError(`guests.${index}.notes`)} />
              </label>
              {guests.length > 1 ? (
                <button
                  className="button button-secondary button-small"
                  type="button"
                  onClick={() =>
                    setGuests((current) =>
                      current.filter((item) => item.key !== guest.key),
                    )
                  }
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
          <button
            className="button button-secondary button-small"
            type="button"
            onClick={() =>
              setGuests((current) => [
                ...current,
                newGuestDraft(draft.searchLastName),
              ])
            }
          >
            Add another person
          </button>
        </div>

        {message ? (
          <p
            className={
              message === "Household created."
                ? "admin-form-message"
                : "admin-form-error"
            }
            role="status"
          >
            {message}
          </p>
        ) : null}
        <button
          className="button button-primary"
          type="submit"
          disabled={pending || !validation.ok}
        >
          {pending ? "Creating household..." : "Create household"}
        </button>
      </form>
    </section>
  );
}

function GuestEditor({
  guest,
  onDelete,
}: {
  guest: InvitedGuest;
  onDelete: (guestId: number) => void;
}) {
  const [draft, setDraft] = useState({
    firstName: guest.firstName,
    lastName: guest.lastName,
    status: guest.status as AdminGuestStatus,
    notes: guest.notes,
  });
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [errors, setErrors] = useState<AdminFieldErrors>({});
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);
  const draftRef = useRef(draft);
  const saveSequence = useRef(0);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  function updateDraft(update: Partial<typeof draft>) {
    const next = { ...draftRef.current, ...update };
    draftRef.current = next;
    setDraft(next);
    setSaveState("dirty");
    setErrors({});
    setMessage("");
  }

  async function save(
    field: "firstName" | "lastName" | "status" | "notes",
    value: string,
  ) {
    const currentDraft = {
      ...draftRef.current,
      [field]: value,
    };
    draftRef.current = currentDraft;
    setDraft(currentDraft);
    const sequence = ++saveSequence.current;
    const validation = validateInvitedGuest(currentDraft);
    if (!validation.ok) {
      setErrors(validation.errors);
      setSaveState("error");
      setMessage("Required guest information is missing.");
      return;
    }

    setSaveState("saving");
    setErrors({});
    setMessage("");
    saveQueue.current = saveQueue.current.then(async () => {
      let result;
      try {
        result = await autosaveGuestAction(guest.id, validation.value);
      } catch {
        if (sequence === saveSequence.current) {
          setSaveState("error");
          setMessage("Not saved. Check your connection and try again.");
        }
        return;
      }
      if (sequence !== saveSequence.current) {
        return;
      }
      if (!result.success) {
        setErrors(result.fieldErrors ?? {});
        setSaveState("error");
        setMessage(result.message);
        return;
      }

      const merged = mergeSavedFields(
        draftRef.current,
        validation.value,
        result.data,
      );
      draftRef.current = merged.value;
      setDraft(merged.value);
      setSaveState(merged.hasNewerChanges ? "dirty" : "saved");
    });
    await saveQueue.current;
  }

  async function remove() {
    if (
      !window.confirm(
        `Delete ${draft.firstName} ${draft.lastName} from this invitation?`,
      )
    ) {
      return;
    }

    setDeleting(true);
    setMessage("");
    let result;
    try {
      result = await removeGuestAction(guest.id);
    } catch {
      setDeleting(false);
      setSaveState("error");
      setMessage("This person was not deleted. Check your connection.");
      return;
    }
    setDeleting(false);
    if (!result.success) {
      setSaveState("error");
      setMessage(result.message);
      return;
    }
    onDelete(guest.id);
  }

  return (
    <div className="guest-admin-row">
      <div className="guest-row-status">
        <SaveIndicator state={saveState} message={message} />
      </div>
      <div className="guest-edit-form">
        <label>
          First Name
          <input
            value={draft.firstName}
            onChange={(event) => updateDraft({ firstName: event.target.value })}
            onBlur={(event) => save("firstName", event.currentTarget.value)}
            maxLength={80}
            aria-invalid={Boolean(errors.firstName)}
          />
          <FieldError message={errors.firstName} />
        </label>
        <label>
          Last Name
          <input
            value={draft.lastName}
            onChange={(event) => updateDraft({ lastName: event.target.value })}
            onBlur={(event) => save("lastName", event.currentTarget.value)}
            maxLength={80}
            aria-invalid={Boolean(errors.lastName)}
          />
          <FieldError message={errors.lastName} />
        </label>
        <label>
          RSVP Status
          <select
            value={draft.status}
            onChange={(event) =>
              updateDraft({
                status: event.target.value as AdminGuestStatus,
              })
            }
            onBlur={(event) => save("status", event.currentTarget.value)}
          >
            <option value="pending">Pending</option>
            <option value="attending">Attending</option>
            <option value="declined">Declined</option>
          </select>
        </label>
        <label>
          Admin Notes
          <textarea
            value={draft.notes}
            onChange={(event) => updateDraft({ notes: event.target.value })}
            onBlur={(event) => save("notes", event.currentTarget.value)}
            maxLength={2000}
            rows={2}
            aria-invalid={Boolean(errors.notes)}
          />
          <FieldError message={errors.notes} />
        </label>
        <button
          className="button button-danger button-small"
          type="button"
          onClick={remove}
          disabled={deleting}
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
      {message ? <p className="admin-row-message">{message}</p> : null}
    </div>
  );
}

function HouseholdEditor({
  household: initialHousehold,
  onDeleted,
}: {
  household: Household;
  onDeleted: (householdId: number) => void;
}) {
  const router = useRouter();
  const [household, setHousehold] = useState(initialHousehold);
  const [draft, setDraft] = useState({
    searchLastName: household.searchLastName,
    householdName: household.householdName,
    contactEmail: household.contactEmail,
    contactPhone: household.contactPhone,
  });
  const [guests, setGuests] = useState(household.guests);
  const [newGuest, setNewGuest] = useState<GuestDraft | null>(null);
  const [newGuestSaveState, setNewGuestSaveState] =
    useState<SaveState>("dirty");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [errors, setErrors] = useState<AdminFieldErrors>({});
  const [message, setMessage] = useState("");
  const [actionPending, setActionPending] = useState(false);
  const draftRef = useRef(draft);
  const newGuestSaving = useRef(false);
  const saveSequence = useRef(0);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  function updateDraft(update: Partial<typeof draft>) {
    const next = { ...draftRef.current, ...update };
    draftRef.current = next;
    setDraft(next);
    setSaveState("dirty");
    setErrors({});
    setMessage("");
  }

  async function saveHousehold(
    field: "searchLastName" | "householdName" | "contactEmail" | "contactPhone",
    value: string,
  ) {
    const currentDraft = {
      ...draftRef.current,
      [field]: value,
    };
    draftRef.current = currentDraft;
    setDraft(currentDraft);
    const sequence = ++saveSequence.current;
    const validation = validateHouseholdDetails(currentDraft);
    if (!validation.ok) {
      setErrors(validation.errors);
      setSaveState("error");
      setMessage("Required household information is missing.");
      return;
    }

    setSaveState("saving");
    setErrors({});
    setMessage("");
    saveQueue.current = saveQueue.current.then(async () => {
      let result;
      try {
        result = await autosaveHouseholdAction({
          id: household.id,
          searchLastName: validation.value.searchLastName,
          householdName: validation.value.householdName,
          contactEmail: validation.value.contactEmail,
          contactPhone: validation.value.contactPhone,
        });
      } catch {
        if (sequence === saveSequence.current) {
          setSaveState("error");
          setMessage("Not saved. Check your connection and try again.");
        }
        return;
      }
      if (sequence !== saveSequence.current) {
        return;
      }
      if (!result.success) {
        setErrors(result.fieldErrors ?? {});
        setSaveState("error");
        setMessage(result.message);
        return;
      }

      const submitted = {
        searchLastName: validation.value.searchLastName,
        householdName: validation.value.householdName,
        contactEmail: validation.value.contactEmail,
        contactPhone: validation.value.contactPhone,
      };
      const merged = mergeSavedFields(draftRef.current, submitted, result.data);
      draftRef.current = merged.value;
      setDraft(merged.value);
      setHousehold((current) => ({
        ...current,
        ...result.data,
      }));
      setSaveState(merged.hasNewerChanges ? "dirty" : "saved");
    });
    await saveQueue.current;
  }

  async function createNewGuest() {
    if (!newGuest || newGuestSaving.current) {
      return;
    }

    const validation = validateInvitedGuest(newGuest);
    if (!validation.ok) {
      setNewGuestSaveState("error");
      setErrors(
        Object.fromEntries(
          Object.entries(validation.errors).map(([key, value]) => [
            `newGuest.${key}`,
            value,
          ]),
        ),
      );
      setMessage("Finish the required person details.");
      return;
    }

    setActionPending(true);
    newGuestSaving.current = true;
    setNewGuestSaveState("saving");
    setMessage("");
    let result;
    try {
      result = await createGuestAction(household.id, {
        firstName: newGuest.firstName,
        lastName: newGuest.lastName,
        status: newGuest.status,
        notes: newGuest.notes,
      });
    } catch {
      setActionPending(false);
      newGuestSaving.current = false;
      setNewGuestSaveState("error");
      setMessage("This person was not added. Check your connection.");
      return;
    }
    setActionPending(false);
    newGuestSaving.current = false;
    if (!result.success) {
      setNewGuestSaveState("error");
      setErrors(
        Object.fromEntries(
          Object.entries(result.fieldErrors ?? {}).map(([key, value]) => [
            `newGuest.${key}`,
            value,
          ]),
        ),
      );
      setMessage(result.message);
      return;
    }

    const now = new Date().toISOString();
    setGuests((current) => [
      ...current,
      {
        id: result.data.guestId,
        householdId: household.id,
        firstName: result.data.firstName,
        lastName: result.data.lastName,
        status: result.data.status,
        notes: result.data.notes,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    setNewGuest(null);
    setErrors({});
    setMessage("");
  }

  function updateNewGuest(update: Partial<GuestDraft>) {
    setNewGuest((current) => (current ? { ...current, ...update } : current));
    setNewGuestSaveState("dirty");
    setErrors({});
    setMessage("");
  }

  function leaveNewGuestRow(event: React.FocusEvent<HTMLDivElement>) {
    if (
      event.relatedTarget instanceof Node &&
      event.currentTarget.contains(event.relatedTarget)
    ) {
      return;
    }
    if (!newGuest) {
      return;
    }
    if (
      !newGuest.firstName.trim() &&
      !newGuest.notes.trim() &&
      newGuest.status === "pending" &&
      !newGuest.lastNameManuallyEdited
    ) {
      setNewGuest(null);
      setErrors({});
      setMessage("");
      return;
    }
    void createNewGuest();
  }

  async function toggleSubmission() {
    setActionPending(true);
    setMessage("");
    const nextLocked = !household.isLocked;
    let result;
    try {
      result = await setHouseholdSubmissionAction(household.id, nextLocked);
    } catch {
      setActionPending(false);
      setMessage("Submission status was not changed. Check your connection.");
      return;
    }
    setActionPending(false);
    if (!result.success) {
      setMessage(result.message);
      return;
    }

    setHousehold((current) => ({
      ...current,
      isLocked: nextLocked,
      submittedAt: nextLocked
        ? (current.submittedAt ?? new Date().toISOString())
        : null,
    }));
    router.refresh();
  }

  async function removeHousehold() {
    if (
      !window.confirm(
        `Delete ${household.householdName} and every invited person in it? This cannot be undone.`,
      )
    ) {
      return;
    }

    setActionPending(true);
    let result;
    try {
      result = await removeHouseholdAction(household.id);
    } catch {
      setActionPending(false);
      setMessage("This household was not deleted. Check your connection.");
      return;
    }
    setActionPending(false);
    if (!result.success) {
      setMessage(result.message);
      return;
    }
    onDeleted(household.id);
    router.refresh();
  }

  return (
    <details className="household-admin-card">
      <summary>
        <span>
          <strong>{household.householdName}</strong>
          <small>
            {guests.length} invited · Last Name: {household.searchLastName}
          </small>
        </span>
        <b className={household.isLocked ? "badge-locked" : "badge-open"}>
          {householdStatusLabel(household.isLocked)}
        </b>
      </summary>

      <div className="household-admin-body">
        <div className="compact-admin-form">
          <div className="admin-editor-heading">
            <h3>Household details</h3>
            <SaveIndicator state={saveState} message={message} />
          </div>
          <div className="admin-form-grid admin-household-fields">
            <label>
              Last Name
              <input
                value={draft.searchLastName}
                onChange={(event) =>
                  updateDraft({
                    searchLastName: event.target.value,
                  })
                }
                onBlur={(event) =>
                  saveHousehold("searchLastName", event.currentTarget.value)
                }
                maxLength={80}
                aria-invalid={Boolean(errors.searchLastName)}
              />
              <FieldError message={errors.searchLastName} />
            </label>
            <label>
              Household Name
              <input
                value={draft.householdName}
                onChange={(event) =>
                  updateDraft({
                    householdName: event.target.value,
                  })
                }
                onBlur={(event) =>
                  saveHousehold("householdName", event.currentTarget.value)
                }
                maxLength={120}
                aria-invalid={Boolean(errors.householdName)}
              />
              <FieldError message={errors.householdName} />
            </label>
            <label>
              Contact Email
              <input
                value={draft.contactEmail}
                onChange={(event) =>
                  updateDraft({
                    contactEmail: event.target.value,
                  })
                }
                onBlur={(event) =>
                  saveHousehold("contactEmail", event.currentTarget.value)
                }
                type="email"
                maxLength={180}
                aria-invalid={Boolean(errors.contactEmail)}
              />
              <FieldError message={errors.contactEmail} />
            </label>
            <label>
              Contact Phone
              <input
                value={draft.contactPhone}
                onChange={(event) =>
                  updateDraft({
                    contactPhone: event.target.value,
                  })
                }
                onBlur={(event) =>
                  saveHousehold("contactPhone", event.currentTarget.value)
                }
                type="tel"
                maxLength={80}
                aria-invalid={Boolean(errors.contactPhone)}
              />
              <FieldError message={errors.contactPhone} />
            </label>
          </div>
        </div>

        <div className="admin-subheading">
          <div>
            <h3>Invited people</h3>
            <p>Submitted: {formatDate(household.submittedAt)}</p>
          </div>
          {!newGuest ? (
            <button
              className="button button-primary button-small"
              type="button"
              onClick={() => {
                setNewGuest(
                  newGuestDraft(
                    defaultGuestLastName(draft.searchLastName, guests),
                  ),
                );
                setNewGuestSaveState("dirty");
              }}
            >
              Add family member
            </button>
          ) : null}
        </div>

        <div className="guest-admin-list">
          {guests.map((guest) => (
            <GuestEditor
              guest={guest}
              key={guest.id}
              onDelete={(guestId) =>
                setGuests((current) =>
                  current.filter((item) => item.id !== guestId),
                )
              }
            />
          ))}
        </div>

        {newGuest ? (
          <div
            className="new-family-member-row"
            onBlur={leaveNewGuestRow}
            role="group"
            aria-label="New family member"
          >
            <div className="new-family-member-status">
              <SaveIndicator state={newGuestSaveState} message={message} />
            </div>
            <label>
              First Name
              <input
                autoFocus
                value={newGuest.firstName}
                disabled={actionPending}
                onChange={(event) =>
                  updateNewGuest({ firstName: event.target.value })
                }
                maxLength={80}
                aria-invalid={Boolean(errors["newGuest.firstName"])}
              />
              <FieldError message={errors["newGuest.firstName"]} />
            </label>
            <label>
              Last Name
              <input
                value={newGuest.lastName}
                disabled={actionPending}
                onChange={(event) =>
                  updateNewGuest({
                    lastName: event.target.value,
                    lastNameManuallyEdited: true,
                  })
                }
                maxLength={80}
                aria-invalid={Boolean(errors["newGuest.lastName"])}
              />
              <FieldError message={errors["newGuest.lastName"]} />
            </label>
            <label>
              RSVP Status
              <select
                value={newGuest.status}
                disabled={actionPending}
                onChange={(event) =>
                  updateNewGuest({
                    status: event.target.value as AdminGuestStatus,
                  })
                }
              >
                <option value="pending">Pending</option>
                <option value="attending">Attending</option>
                <option value="declined">Declined</option>
              </select>
            </label>
            <label>
              Admin Notes
              <textarea
                value={newGuest.notes}
                disabled={actionPending}
                onChange={(event) =>
                  updateNewGuest({ notes: event.target.value })
                }
                maxLength={2000}
                rows={2}
                aria-invalid={Boolean(errors["newGuest.notes"])}
              />
              <FieldError message={errors["newGuest.notes"]} />
            </label>
            <button
              className="button button-secondary button-small"
              type="button"
              disabled={actionPending}
              onClick={() => {
                setNewGuest(null);
                setErrors({});
                setMessage("");
              }}
            >
              Cancel
            </button>
          </div>
        ) : null}

        {message ? (
          <p className="admin-row-message" role="alert" aria-live="assertive">
            {message}
          </p>
        ) : null}

        <div className="household-admin-actions">
          <button
            className="button button-secondary button-small"
            type="button"
            onClick={toggleSubmission}
            disabled={actionPending}
          >
            {householdStatusActionLabel(household.isLocked)}
          </button>
          <button
            className="button button-danger button-small"
            type="button"
            onClick={removeHousehold}
            disabled={actionPending}
          >
            Delete household
          </button>
        </div>
      </div>
    </details>
  );
}

export function HouseholdManager({
  initialHouseholds,
  filter,
}: {
  initialHouseholds: Household[];
  filter: string;
}) {
  const [deletedHouseholdIds, setDeletedHouseholdIds] = useState<Set<number>>(
    () => new Set(),
  );
  const households = initialHouseholds.filter(
    (household) => !deletedHouseholdIds.has(household.id),
  );

  return (
    <>
      <CreateHouseholdForm />

      <section className="household-directory">
        <div className="directory-heading">
          <div>
            <p className="eyebrow">Households</p>
            <h2>Manage invitations</h2>
          </div>
          <form className="admin-search" method="get">
            <label htmlFor="household-filter">Search households</label>
            <div>
              <input
                id="household-filter"
                name="q"
                type="search"
                defaultValue={filter}
                maxLength={100}
                placeholder="Name or guest"
              />
              <button className="button button-small" type="submit">
                Filter
              </button>
            </div>
          </form>
        </div>

        {households.length === 0 ? (
          <div className="empty-state">
            <h2>No households found</h2>
            <p>
              {filter
                ? "Try a different search."
                : "Add the first household above."}
            </p>
          </div>
        ) : (
          <div className="household-admin-list">
            {households.map((household) => (
              <HouseholdEditor
                household={household}
                key={household.id}
                onDeleted={(householdId) =>
                  setDeletedHouseholdIds((current) => {
                    const next = new Set(current);
                    next.add(householdId);
                    return next;
                  })
                }
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
