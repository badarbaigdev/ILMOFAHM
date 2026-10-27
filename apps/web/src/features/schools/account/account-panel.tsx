"use client";

import { useActionState } from "react";

import {
  type SchoolAccountActionState,
  updateSchoolAccountPasswordAction,
  updateSchoolAccountProfileAction,
} from "@/features/schools/account/actions";

const initial: SchoolAccountActionState = { error: null, success: null };

type Props = {
  email: string;
  fullName: string;
};

export function SchoolAccountPanel({ email, fullName }: Props) {
  const [profileState, profileAction, profilePending] = useActionState(
    updateSchoolAccountProfileAction,
    initial,
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    updateSchoolAccountPasswordAction,
    initial,
  );

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line bg-paper-elevated p-5 sm:p-6">
        <h2 className="text-sm font-semibold tracking-wide text-ink uppercase">
          Profile
        </h2>
        <p className="mt-1 text-sm text-muted">
          Your name appears in the school console. Email cannot be changed here.
        </p>
        <form
          action={profileAction}
          className="mt-6 max-w-md space-y-4"
          noValidate
        >
          <div className="space-y-1.5">
            <label
              htmlFor="account-email"
              className="block text-sm font-medium text-ink"
            >
              Email
            </label>
            <input
              id="account-email"
              type="email"
              value={email}
              readOnly
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-muted outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="account-full-name"
              className="block text-sm font-medium text-ink"
            >
              Full name <span className="text-red-700">*</span>
            </label>
            <input
              id="account-full-name"
              name="full_name"
              type="text"
              required
              defaultValue={fullName}
              maxLength={120}
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus-visible:border-teal"
            />
          </div>
          {profileState.error ? (
            <p role="alert" className="text-sm text-red-700">
              {profileState.error}
            </p>
          ) : null}
          {profileState.success ? (
            <p role="status" className="text-sm text-teal">
              {profileState.success}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={profilePending}
            className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {profilePending ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-line bg-paper-elevated p-5 sm:p-6">
        <h2 className="text-sm font-semibold tracking-wide text-ink uppercase">
          Password
        </h2>
        <p className="mt-1 text-sm text-muted">
          Choose a new password with at least 8 characters.
        </p>
        <form
          action={passwordAction}
          className="mt-6 max-w-md space-y-4"
          noValidate
        >
          <div className="space-y-1.5">
            <label
              htmlFor="account-password"
              className="block text-sm font-medium text-ink"
            >
              New password <span className="text-red-700">*</span>
            </label>
            <input
              id="account-password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus-visible:border-teal"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="account-confirm-password"
              className="block text-sm font-medium text-ink"
            >
              Confirm password <span className="text-red-700">*</span>
            </label>
            <input
              id="account-confirm-password"
              name="confirm_password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus-visible:border-teal"
            />
          </div>
          {passwordState.error ? (
            <p role="alert" className="text-sm text-red-700">
              {passwordState.error}
            </p>
          ) : null}
          {passwordState.success ? (
            <p role="status" className="text-sm text-teal">
              {passwordState.success}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={passwordPending}
            className="rounded-md border border-line bg-paper px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
          >
            {passwordPending ? "Updating…" : "Update password"}
          </button>
        </form>
      </section>
    </div>
  );
}
