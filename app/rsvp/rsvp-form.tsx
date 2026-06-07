"use client";

import { useActionState } from "react";
import { submitRsvp, type RsvpFormState } from "./actions";

const initialState: RsvpFormState = {};

export function RsvpForm() {
  const [state, formAction, pending] = useActionState(submitRsvp, initialState);

  return (
    <form className="form-grid" action={formAction} noValidate>
      {state.message ? (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="fullName">Full name</label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          maxLength={120}
          required
          aria-describedby={
            state.errors?.fullName ? "fullName-error" : undefined
          }
        />
        {state.errors?.fullName ? (
          <span className="field-error" id="fullName-error">
            {state.errors.fullName}
          </span>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="attending">Will you be attending?</label>
        <select
          id="attending"
          name="attending"
          defaultValue=""
          required
          aria-describedby={
            state.errors?.attending ? "attending-error" : undefined
          }
        >
          <option value="" disabled>
            Choose a response
          </option>
          <option value="yes">Joyfully accepts</option>
          <option value="no">Regretfully declines</option>
        </select>
        {state.errors?.attending ? (
          <span className="field-error" id="attending-error">
            {state.errors.attending}
          </span>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="guestCount">Total guests in your party</label>
        <input
          id="guestCount"
          name="guestCount"
          type="number"
          min={1}
          max={10}
          defaultValue={1}
          inputMode="numeric"
          aria-describedby={
            state.errors?.guestCount ? "guestCount-error" : undefined
          }
        />
        {state.errors?.guestCount ? (
          <span className="field-error" id="guestCount-error">
            {state.errors.guestCount}
          </span>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="mealChoice">Meal choice</label>
        <select
          id="mealChoice"
          name="mealChoice"
          defaultValue=""
          aria-describedby={
            state.errors?.mealChoice ? "mealChoice-error" : undefined
          }
        >
          <option value="" disabled>
            Select a meal
          </option>
          <option value="chicken">Herb-roasted chicken</option>
          <option value="beef">Braised beef</option>
          <option value="vegetarian">Vegetarian</option>
          <option value="vegan">Vegan</option>
          <option value="kids">Kids meal</option>
        </select>
        {state.errors?.mealChoice ? (
          <span className="field-error" id="mealChoice-error">
            {state.errors.mealChoice}
          </span>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="songRequest">Song request</label>
        <input
          id="songRequest"
          name="songRequest"
          type="text"
          maxLength={120}
          placeholder="What will get you on the dance floor?"
          aria-describedby={
            state.errors?.songRequest ? "songRequest-error" : undefined
          }
        />
        {state.errors?.songRequest ? (
          <span className="field-error" id="songRequest-error">
            {state.errors.songRequest}
          </span>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="message">Message for the couple</label>
        <textarea
          id="message"
          name="message"
          rows={4}
          maxLength={600}
          placeholder="Optional"
          aria-describedby={state.errors?.message ? "message-error" : undefined}
        />
        {state.errors?.message ? (
          <span className="field-error" id="message-error">
            {state.errors.message}
          </span>
        ) : null}
      </div>

      <div className="honeypot" aria-hidden="true">
        <label htmlFor="website">Leave this field empty</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="form-actions">
        <button className="button button-secondary" disabled={pending}>
          {pending ? "Sending…" : "Send RSVP"}
        </button>
      </div>
    </form>
  );
}
