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
  type DemoFormValues,
  type FieldErrors,
  validateDemoForm,
} from "@/features/marketing/validate";

const empty: DemoFormValues = {
  name: "",
  email: "",
  schoolName: "",
  phone: "",
  preferredTime: "",
  notes: "",
};

export function DemoForm() {
  const formId = useId();
  const [values, setValues] = useState<DemoFormValues>(empty);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "invalid" | "validated">(
    "idle",
  );

  function update<K extends keyof DemoFormValues>(
    key: K,
    value: DemoFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateDemoForm(values);
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
          Your demo request looks valid. It has not been delivered or stored yet
          — the demo backend is not connected in this milestone.
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
          Work email
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
        <label className={fieldLabelClass} htmlFor={`${formId}-school`}>
          School or academy name
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
        <label className={fieldLabelClass} htmlFor={`${formId}-time`}>
          Preferred time{" "}
          <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id={`${formId}-time`}
          name="preferredTime"
          className={fieldInputClass}
          placeholder="e.g. Weekday mornings"
          value={values.preferredTime}
          onChange={(event) => update("preferredTime", event.target.value)}
        />
        <p className={fieldHintClass}>
          We will use this once scheduling is live.
        </p>
      </div>

      <div>
        <label className={fieldLabelClass} htmlFor={`${formId}-notes`}>
          Notes <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id={`${formId}-notes`}
          name="notes"
          className={fieldTextareaClass}
          value={values.notes}
          onChange={(event) => update("notes", event.target.value)}
        />
      </div>

      <button type="submit" className={primaryButtonClass}>
        Validate demo request
      </button>
    </form>
  );
}
