"use client";

import { useActionState, useState } from "react";
import type { PublicHousehold } from "@/lib/database";
import {
  searchHouseholds,
  submitHouseholdRsvp,
  type HouseholdResponseState,
  type HouseholdSearchState,
} from "./actions";

const initialSearchState: HouseholdSearchState = {};
const initialResponseState: HouseholdResponseState = {};

function statusLabel(status: PublicHousehold["guests"][number]["status"]) {
  const labels = {
    pending: "Awaiting response",
    attending: "Attending",
    declined: "Declined",
  };

  return labels[status];
}

function HouseholdResponseForm({ household }: { household: PublicHousehold }) {
  const [state, formAction, pending] = useActionState(
    submitHouseholdRsvp,
    initialResponseState,
  );

  if (household.isLocked) {
    return (
      <section className="selected-household" aria-live="polite">
        <p className="household-kicker">Response received</p>
        <h2>{household.householdName}</h2>
        <p>
          This household has already submitted its RSVP. Contact the host if a
          response needs to be changed.
        </p>
        <ul className="locked-response-list">
          {household.guests.map((guest) => (
            <li key={guest.id}>
              <span>
                {guest.firstName} {guest.lastName}
              </span>
              <strong>{statusLabel(guest.status)}</strong>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <form className="selected-household" action={formAction}>
      <input type="hidden" name="householdId" value={household.id} />
      <p className="household-kicker">Your invitation</p>
      <h2>{household.householdName}</h2>
      <p>Choose a response for each person listed below.</p>

      {state.message ? (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="guest-response-list">
        {household.guests.map((guest) => (
          <fieldset className="guest-response" key={guest.id}>
            <legend>
              {guest.firstName} {guest.lastName}
            </legend>
            <label>
              <input
                type="radio"
                name={`guest-${guest.id}`}
                value="attending"
                required
              />
              <span>Joyfully accepts</span>
            </label>
            <label>
              <input
                type="radio"
                name={`guest-${guest.id}`}
                value="declined"
                required
              />
              <span>Regretfully declines</span>
            </label>
          </fieldset>
        ))}
      </div>

      <div className="final-warning">
        <strong>Please review before confirming</strong>
        <p>
          After submission, this household cannot change its response online.
          Contact the host if an update is needed.
        </p>
        <label>
          <input type="checkbox" name="confirmFinal" value="yes" required />
          <span>I understand that this RSVP is final.</span>
        </label>
      </div>

      <div className="honeypot" aria-hidden="true">
        <label htmlFor={`response-website-${household.id}`}>
          Leave this field empty
        </label>
        <input
          id={`response-website-${household.id}`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <button className="button button-primary" disabled={pending}>
        {pending ? "Confirming…" : "Confirm household RSVP"}
      </button>
    </form>
  );
}

export function RsvpLookup() {
  const [state, formAction, pending] = useActionState(
    searchHouseholds,
    initialSearchState,
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedHousehold = state.households?.find(
    (household) => household.id === selectedId,
  );

  return (
    <div className="rsvp-lookup">
      <form
        className="lookup-form"
        action={formAction}
        onSubmit={() => setSelectedId(null)}
      >
        <div className="field">
          <label htmlFor="lastName">Last name on the invitation</label>
          <input
            id="lastName"
            name="lastName"
            type="search"
            autoComplete="family-name"
            minLength={2}
            maxLength={80}
            required
          />
        </div>

        <div className="honeypot" aria-hidden="true">
          <label htmlFor="search-website">Leave this field empty</label>
          <input
            id="search-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <button className="button button-primary" disabled={pending}>
          {pending ? "Searching…" : "Find my invitation"}
        </button>
      </form>

      {state.message ? (
        <p className="lookup-message" role="status">
          {state.message}
        </p>
      ) : null}

      {state.households && state.households.length > 0 ? (
        <section className="household-results" aria-live="polite">
          <div>
            <p className="household-kicker">Search results</p>
            <h2>Select your household</h2>
          </div>
          <div className="household-result-list">
            {state.households.map((household) => (
              <button
                className="household-result"
                key={household.id}
                type="button"
                aria-pressed={selectedId === household.id}
                onClick={() => setSelectedId(household.id)}
              >
                <span>
                  <strong>{household.householdName}</strong>
                  <small>
                    {household.guests
                      .map((guest) => `${guest.firstName} ${guest.lastName}`)
                      .join(", ")}
                  </small>
                </span>
                <b>{household.isLocked ? "Submitted" : "Select"}</b>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {selectedHousehold ? (
        <HouseholdResponseForm
          key={selectedHousehold.id}
          household={selectedHousehold}
        />
      ) : null}
    </div>
  );
}
