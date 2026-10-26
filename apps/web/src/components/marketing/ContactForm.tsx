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
  type ContactFormValues,
  type FieldErrors,
  validateContactForm,
} from "@/features/marketing/validate";

const empty: ContactFormValues = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

export function ContactForm() {
  const formId = useId();
  const [values, setValues] = useState<ContactFormValues>(empty);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "invalid" | "validated">(
    "idle",
  );

  function update<K extends keyof ContactFormValues>(
    key: K,
    value: ContactFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateContactForm(values);
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
        {formNotices.demoStage}
      </p>

      {status === "validated" ? (
        <p
          className="rounded-md border border-teal/30 bg-teal/10 px-4 py-3 text-sm text-ink"
          role="status"
        >
          Your message looks valid. It has not been delivered or stored yet —
          the contact backend is not connected in this milestone.
        </p>
      ) : null}

      {status === "invalid" ? (
        <p className="text-sm text-red-800" role="alert">
          Please correct the highlighted fields.
        </p>
      ) : null}

      <div>
        <label className={fieldLabelClass} htmlFor={`${formId}-name`}>
          Name
        </label>
        <input
          id={`${formId}-name`}
          name="name"
          autoComplete="name"
          className={fieldInputClass}
          value={values.name}
          onChange={(event) => update("name", event.target.value)}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? `${formId}-name-error` : undefined}
        />
        {errors.name ? (
          <p id={`${formId}-name-error`} className={fieldErrorClass}>
            {errors.name}
          </p>
        ) : null}
      </div>

      <div>
        <label className={fieldLabelClass} htmlFor={`${formId}-email`}>
          Email
        </label>
        <input
          id={`${formId}-email`}
          name="email"
          type="email"
          autoComplete="email"
          className={fieldInputClass}
          value={values.email}
          onChange={(event) => update("email", event.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? `${formId}-email-error` : undefined}
        />
        {errors.email ? (
          <p id={`${formId}-email-error`} className={fieldErrorClass}>
            {errors.email}
          </p>
        ) : null}
      </div>

      <div>
        <label className={fieldLabelClass} htmlFor={`${formId}-subject`}>
          Subject
        </label>
        <input
          id={`${formId}-subject`}
          name="subject"
          className={fieldInputClass}
          value={values.subject}
          onChange={(event) => update("subject", event.target.value)}
          aria-invalid={Boolean(errors.subject)}
          aria-describedby={
            errors.subject ? `${formId}-subject-error` : undefined
          }
        />
        {errors.subject ? (
          <p id={`${formId}-subject-error`} className={fieldErrorClass}>
            {errors.subject}
          </p>
        ) : null}
      </div>

      <div>
        <label className={fieldLabelClass} htmlFor={`${formId}-message`}>
          Message
        </label>
        <textarea
          id={`${formId}-message`}
          name="message"
          className={fieldTextareaClass}
          value={values.message}
          onChange={(event) => update("message", event.target.value)}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={
            errors.message ? `${formId}-message-error` : undefined
          }
        />
        {errors.message ? (
          <p id={`${formId}-message-error`} className={fieldErrorClass}>
            {errors.message}
          </p>
        ) : (
          <p className={fieldHintClass}>At least 10 characters.</p>
        )}
      </div>

      <button type="submit" className={primaryButtonClass}>
        Validate message
      </button>
    </form>
  );
}
