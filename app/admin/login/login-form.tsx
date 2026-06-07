"use client";

import { useActionState } from "react";
import { login, type LoginFormState } from "../actions";

const initialState: LoginFormState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form className="form-grid" action={formAction}>
      {state.message ? (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      ) : null}
      <div className="field">
        <label htmlFor="password">Admin password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
        />
      </div>
      <div className="form-actions">
        <button className="button button-secondary" disabled={pending}>
          {pending ? "Checking…" : "Sign in"}
        </button>
      </div>
    </form>
  );
}
