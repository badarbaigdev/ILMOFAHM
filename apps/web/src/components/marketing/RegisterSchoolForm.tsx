"use client";

import { useActionState, useId } from "react";

import {
  fieldErrorClass,
  fieldHintClass,
  fieldInputClass,
  fieldLabelClass,
  fieldTextareaClass,
  primaryButtonClass,
} from "@/components/marketing/form-styles";
import { formNotices } from "@/features/marketing/content";
import { submitSchoolApplicationAction } from "@/features/school-applications/actions";
import { initialSubmitSchoolApplicationState } from "@/features/school-applications/types";

export function RegisterSchoolForm() {
  const formId = useId();
  const [state, formAction, pending] = useActionState(
    submitSchoolApplicationAction,
    initialSubmitSchoolApplicationState,
  );

  const errors = state.fieldErrors ?? {};

  return (
    <form
      noValidate
      action={formAction}
      className="relative mx-auto w-full max-w-xl space-y-5"
      aria-describedby={`${formId}-notice`}
    >
      <p
        id={`${formId}-notice`}
        className="rounded-md border border-line bg-paper-elevated/70 px-4 py-3 text-sm leading-relaxed text-muted"
        role="note"
      >
        {formNotices.registerStage}
      </p>

      {/* Honeypot — visually and accessibly hidden; bots that fill it are rejected. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor={`${formId}-website`}>Company website</label>
        <input
          id={`${formId}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      {state.success ? (
        <p
          className="rounded-md border border-teal/30 bg-teal/10 px-4 py-3 text-sm text-ink"
          role="status"
        >
          {state.success}
        </p>
      ) : null}

      {state.error ? (
        <p className="text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}

      <div>
        <label className={fieldLabelClass} htmlFor={`${formId}-school`}>
          School name
        </label>
        <input
          id={`${formId}-school`}
          name="schoolName"
          className={fieldInputClass}
          required
          disabled={pending || Boolean(state.success)}
          aria-invalid={Boolean(errors.schoolName)}
          aria-describedby={
            errors.schoolName ? `${formId}-school-error` : undefined
          }
        />
        {errors.schoolName ? (
          <p id={`${formId}-school-error`} className={fieldErrorClass}>
            {errors.schoolName}
          </p>
        ) : null}
      </div>

      <div>
        <label className={fieldLabelClass} htmlFor={`${formId}-applicant`}>
          Your name
        </label>
        <input
          id={`${formId}-applicant`}
          name="applicantName"
          autoComplete="name"
          className={fieldInputClass}
          required
          disabled={pending || Boolean(state.success)}
          aria-invalid={Boolean(errors.applicantName)}
          aria-describedby={
            errors.applicantName ? `${formId}-applicant-error` : undefined
          }
        />
        {errors.applicantName ? (
          <p id={`${formId}-applicant-error`} className={fieldErrorClass}>
            {errors.applicantName}
          </p>
        ) : null}
      </div>

      <div>
        <label className={fieldLabelClass} htmlFor={`${formId}-email`}>
          Work email
        </label>
        <input
          id={`${formId}-email`}
          name="applicantEmail"
          type="email"
          autoComplete="email"
          className={fieldInputClass}
          required
          disabled={pending || Boolean(state.success)}
          aria-invalid={Boolean(errors.applicantEmail)}
          aria-describedby={
            errors.applicantEmail ? `${formId}-email-error` : undefined
          }
        />
        {errors.applicantEmail ? (
          <p id={`${formId}-email-error`} className={fieldErrorClass}>
            {errors.applicantEmail}
          </p>
        ) : null}
      </div>

      <div>
        <label className={fieldLabelClass} htmlFor={`${formId}-phone`}>
          Phone <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id={`${formId}-phone`}
          name="phone"
          type="tel"
          autoComplete="tel"
          className={fieldInputClass}
          disabled={pending || Boolean(state.success)}
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? `${formId}-phone-error` : undefined}
        />
        {errors.phone ? (
          <p id={`${formId}-phone-error`} className={fieldErrorClass}>
            {errors.phone}
          </p>
        ) : null}
      </div>

      <div>
        <label className={fieldLabelClass} htmlFor={`${formId}-city`}>
          City
        </label>
        <input
          id={`${formId}-city`}
          name="city"
          autoComplete="address-level2"
          className={fieldInputClass}
          required
          disabled={pending || Boolean(state.success)}
          aria-invalid={Boolean(errors.city)}
          aria-describedby={errors.city ? `${formId}-city-error` : undefined}
        />
        {errors.city ? (
          <p id={`${formId}-city-error`} className={fieldErrorClass}>
            {errors.city}
          </p>
        ) : null}
      </div>

      <div>
        <label className={fieldLabelClass} htmlFor={`${formId}-type`}>
          Institution type
        </label>
        <select
          id={`${formId}-type`}
          name="institutionType"
          className={fieldInputClass}
          required
          defaultValue=""
          disabled={pending || Boolean(state.success)}
          aria-invalid={Boolean(errors.institutionType)}
          aria-describedby={
            errors.institutionType ? `${formId}-type-error` : undefined
          }
        >
          <option value="">Select type</option>
          <option value="school">School</option>
          <option value="academy">Academy</option>
          <option value="both">School and academy</option>
        </select>
        {errors.institutionType ? (
          <p id={`${formId}-type-error`} className={fieldErrorClass}>
            {errors.institutionType}
          </p>
        ) : (
          <p className={fieldHintClass}>
            Helps platform operators tailor onboarding after approval.
          </p>
        )}
      </div>

      <div>
        <label className={fieldLabelClass} htmlFor={`${formId}-message`}>
          Additional details{" "}
          <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id={`${formId}-message`}
          name="message"
          className={fieldTextareaClass}
          disabled={pending || Boolean(state.success)}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={
            errors.message ? `${formId}-message-error` : undefined
          }
        />
        {errors.message ? (
          <p id={`${formId}-message-error`} className={fieldErrorClass}>
            {errors.message}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        className={primaryButtonClass}
        disabled={pending || Boolean(state.success)}
      >
        {pending
          ? "Submitting…"
          : state.success
            ? "Application submitted"
            : "Submit application"}
      </button>
    </form>
  );
}
