"use client";

import { FormEvent, useId, useState } from "react";

import {
  fieldErrorClass,
  fieldHintClass,
  fieldInputClass,
  fieldLabelClass,
  fieldTextareaClass,
  primaryButtonClass,
} from "@/components/marketing/form-styles";
import { formNotices } from "@/features/marketing/content";
import {
  type FieldErrors,
  type RegisterSchoolFormValues,
  validateRegisterSchoolForm,
} from "@/features/marketing/validate";

const empty: RegisterSchoolFormValues = {
  schoolName: "",
  applicantName: "",
  applicantEmail: "",
  phone: "",
  city: "",
  institutionType: "",
  message: "",
};

export function RegisterSchoolForm() {
  const formId = useId();
  const [values, setValues] = useState<RegisterSchoolFormValues>(empty);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "invalid" | "validated">(
    "idle",
  );

  function update<K extends keyof RegisterSchoolFormValues>(
    key: K,
    value: RegisterSchoolFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateRegisterSchoolForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatus("invalid");
      return;
    }
    setStatus("validated");
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="mx-auto w-full max-w-xl space-y-5"
      aria-describedby={`${formId}-notice`}
    >
      <p
        id={`${formId}-notice`}
        className="rounded-md border border-line bg-paper-elevated/70 px-4 py-3 text-sm leading-relaxed text-muted"
        role="note"
      >
        {formNotices.registerStage}
      </p>

      {status === "validated" ? (
        <p
          className="rounded-md border border-teal/30 bg-teal/10 px-4 py-3 text-sm text-ink"
          role="status"
        >
          Your application details look valid. A pending database record is not
          created yet — public registration persistence arrives in the next
          backend milestone.
        </p>
      ) : null}

      {status === "invalid" ? (
        <p className="text-sm text-red-800" role="alert">
          Please correct the highlighted fields.
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
          value={values.schoolName}
          onChange={(event) => update("schoolName", event.target.value)}
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
          value={values.applicantName}
          onChange={(event) => update("applicantName", event.target.value)}
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
          value={values.applicantEmail}
          onChange={(event) => update("applicantEmail", event.target.value)}
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
          value={values.phone}
          onChange={(event) => update("phone", event.target.value)}
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
          value={values.city}
          onChange={(event) => update("city", event.target.value)}
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
          value={values.institutionType}
          onChange={(event) => update("institutionType", event.target.value)}
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
            Helps us tailor onboarding when registration is connected.
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
          value={values.message}
          onChange={(event) => update("message", event.target.value)}
        />
      </div>

      <button type="submit" className={primaryButtonClass}>
        Validate application
      </button>
    </form>
  );
}
