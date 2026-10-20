"use client";

import { useActionState } from "react";

import {
  type AuthActionState,
  requestPasswordResetAction,
  signInAction,
  signUpAction,
  updatePasswordAction,
} from "@/features/auth/actions";

const initialState: AuthActionState = { error: null, success: null };

type Field = {
  name: string;
  label: string;
  type: string;
  autoComplete?: string;
  required?: boolean;
};

function AuthFormShell({
  title,
  description,
  action,
  fields,
  submitLabel,
  hiddenFields,
}: {
  title: string;
  description: string;
  action: (
    state: AuthActionState,
    formData: FormData,
  ) => Promise<AuthActionState>;
  fields: Field[];
  submitLabel: string;
  hiddenFields?: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <section
      aria-labelledby="auth-form-title"
      className="mx-auto w-full max-w-md px-6 py-16 sm:px-10"
    >
      <h1
        id="auth-form-title"
        className="font-display text-3xl tracking-tight text-ink"
      >
        {title}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">{description}</p>

      <form action={formAction} className="mt-8 space-y-4" noValidate>
        {hiddenFields
          ? Object.entries(hiddenFields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))
          : null}

        {fields.map((field) => (
          <div key={field.name} className="space-y-1.5">
            <label
              htmlFor={field.name}
              className="block text-sm font-medium text-ink"
            >
              {field.label}
            </label>
            <input
              id={field.name}
              name={field.name}
              type={field.type}
              autoComplete={field.autoComplete}
              required={field.required !== false}
              className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
            />
          </div>
        ))}

        {state.error ? (
          <p role="alert" className="text-sm text-red-700">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p role="status" className="text-sm text-teal">
            {state.success}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper-elevated disabled:opacity-60"
        >
          {pending ? "Please wait…" : submitLabel}
        </button>
      </form>
    </section>
  );
}

export function SignInForm({ nextPath }: { nextPath: string }) {
  return (
    <AuthFormShell
      title="Sign in"
      description="Use your ILMOFAHM account email and password."
      action={signInAction}
      submitLabel="Sign in"
      hiddenFields={{ next: nextPath }}
      fields={[
        {
          name: "email",
          label: "Email",
          type: "email",
          autoComplete: "email",
        },
        {
          name: "password",
          label: "Password",
          type: "password",
          autoComplete: "current-password",
        },
      ]}
    />
  );
}

export function SignUpForm() {
  return (
    <AuthFormShell
      title="Create account"
      description="Registers an Auth user and profile only. Organization onboarding comes in a later milestone."
      action={signUpAction}
      submitLabel="Create account"
      fields={[
        {
          name: "full_name",
          label: "Full name",
          type: "text",
          autoComplete: "name",
          required: false,
        },
        {
          name: "email",
          label: "Email",
          type: "email",
          autoComplete: "email",
        },
        {
          name: "password",
          label: "Password",
          type: "password",
          autoComplete: "new-password",
        },
      ]}
    />
  );
}

export function ForgotPasswordForm() {
  return (
    <AuthFormShell
      title="Reset password"
      description="We will email a reset link if an account exists for that address."
      action={requestPasswordResetAction}
      submitLabel="Send reset link"
      fields={[
        {
          name: "email",
          label: "Email",
          type: "email",
          autoComplete: "email",
        },
      ]}
    />
  );
}

export function UpdatePasswordForm() {
  return (
    <AuthFormShell
      title="Choose a new password"
      description="Set a new password for your signed-in recovery session."
      action={updatePasswordAction}
      submitLabel="Update password"
      fields={[
        {
          name: "password",
          label: "New password",
          type: "password",
          autoComplete: "new-password",
        },
        {
          name: "confirm_password",
          label: "Confirm password",
          type: "password",
          autoComplete: "new-password",
        },
      ]}
    />
  );
}
