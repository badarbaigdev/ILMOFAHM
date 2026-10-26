"use client";

import { useActionState } from "react";

import {
  ORGANIZATION_LOCALES,
  ORGANIZATION_TIMEZONES,
  WEEKDAY_OPTIONS,
  localeLabel,
} from "@/features/institution/calendar/options";
import { institutionTypeLabel } from "@/features/institution/mode";
import type {
  SchoolCampusRecord,
  SchoolHolidayRecord,
  SchoolRecord,
} from "@/features/schools/context";
import {
  completeSchoolSetupAction,
  createSchoolCampusAction,
  createSchoolHolidayAction,
  deleteSchoolHolidayAction,
  type SchoolSetupActionState,
  updateSchoolBrandingAction,
  updateSchoolCampusAction,
  updateSchoolLocaleAction,
  updateSchoolProfileAction,
} from "@/features/schools/setup/actions";

const initial: SchoolSetupActionState = { error: null, success: null };

function Feedback({ state }: { state: SchoolSetupActionState }) {
  return (
    <>
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
    </>
  );
}

export function SchoolProfilePanel({
  school,
  canManage,
}: {
  school: SchoolRecord;
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState(
    updateSchoolProfileAction,
    initial,
  );

  return (
    <section aria-labelledby="school-profile-heading" className="mt-10">
      <h2
        id="school-profile-heading"
        className="text-sm font-semibold tracking-wide text-ink uppercase"
      >
        School profile
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Confirm the school name, type, and contact details used across the
        portal. Current mode: {institutionTypeLabel(school.institutionType)}.
      </p>
      {canManage ? (
        <form action={action} className="mt-6 max-w-lg space-y-4" noValidate>
          <input type="hidden" name="school_id" value={school.id} />
          <Field label="School name" name="name" defaultValue={school.name} required />
          <div className="space-y-1.5">
            <label htmlFor="institution_type" className="block text-sm font-medium text-ink">
              Institution type
            </label>
            <select
              id="institution_type"
              name="institution_type"
              required
              defaultValue={school.institutionType}
              className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
            >
              <option value="school">School</option>
              <option value="academy">Academy</option>
              <option value="both">School and academy</option>
            </select>
          </div>
          <Field label="Email" name="email" type="email" defaultValue={school.email ?? ""} />
          <Field label="Phone" name="phone" defaultValue={school.phone ?? ""} />
          <Field
            label="Address"
            name="address_line1"
            defaultValue={school.addressLine1 ?? ""}
          />
          <Field label="City" name="city" defaultValue={school.city ?? ""} />
          <Field label="Region" name="region" defaultValue={school.region ?? ""} />
          <Field
            label="Country code"
            name="country_code"
            defaultValue={school.countryCode}
            required
          />
          <Feedback state={state} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md border border-line bg-paper-elevated px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save profile"}
          </button>
        </form>
      ) : (
        <p role="status" className="mt-6 text-sm text-muted">
          Only owners and admins can edit school profile.
        </p>
      )}
    </section>
  );
}

export function SchoolBrandingPanel({
  school,
  canManage,
}: {
  school: SchoolRecord;
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState(
    updateSchoolBrandingAction,
    initial,
  );

  return (
    <section aria-labelledby="school-branding-heading" className="mt-10">
      <h2
        id="school-branding-heading"
        className="text-sm font-semibold tracking-wide text-ink uppercase"
      >
        Branding
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Optional public website and brand accents. Logo must be an https URL
        for now.
      </p>
      {canManage ? (
        <form action={action} className="mt-6 max-w-lg space-y-4" noValidate>
          <input type="hidden" name="school_id" value={school.id} />
          <Field
            label="Website URL"
            name="website_url"
            defaultValue={school.websiteUrl ?? ""}
          />
          <Field
            label="Brand display name"
            name="brand_display_name"
            defaultValue={school.brandDisplayName ?? ""}
          />
          <Field
            label="Brand color (#RRGGBB)"
            name="brand_primary_color"
            defaultValue={school.brandPrimaryColor ?? ""}
          />
          <Field
            label="Logo URL (https)"
            name="brand_logo_url"
            defaultValue={school.brandLogoUrl ?? ""}
          />
          <Feedback state={state} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md border border-line bg-paper-elevated px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save branding"}
          </button>
        </form>
      ) : (
        <p role="status" className="mt-6 text-sm text-muted">
          Only owners and admins can edit branding.
        </p>
      )}
    </section>
  );
}

export function SchoolLocalePanel({
  school,
  holidays,
  canManage,
}: {
  school: SchoolRecord;
  holidays: SchoolHolidayRecord[];
  canManage: boolean;
}) {
  const [localeState, localeAction, localePending] = useActionState(
    updateSchoolLocaleAction,
    initial,
  );
  const [holidayState, holidayAction, holidayPending] = useActionState(
    createSchoolHolidayAction,
    initial,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteSchoolHolidayAction,
    initial,
  );

  return (
    <section aria-labelledby="school-locale-heading" className="mt-10">
      <h2
        id="school-locale-heading"
        className="text-sm font-semibold tracking-wide text-ink uppercase"
      >
        Locale & calendar
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Timezone, default language, working days, and holiday placeholders.
      </p>
      {canManage ? (
        <>
          <form
            action={localeAction}
            className="mt-6 max-w-lg space-y-4"
            noValidate
          >
            <input type="hidden" name="school_id" value={school.id} />
            <div className="space-y-1.5">
              <label htmlFor="timezone" className="block text-sm font-medium text-ink">
                Timezone
              </label>
              <select
                id="timezone"
                name="timezone"
                required
                defaultValue={school.timezone}
                className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
              >
                {ORGANIZATION_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="default_locale"
                className="block text-sm font-medium text-ink"
              >
                Default language
              </label>
              <select
                id="default_locale"
                name="default_locale"
                required
                defaultValue={school.defaultLocale}
                className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
              >
                {ORGANIZATION_LOCALES.map((locale) => (
                  <option key={locale} value={locale}>
                    {localeLabel(locale)}
                  </option>
                ))}
              </select>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-ink">Working days</legend>
              <div className="flex flex-wrap gap-3">
                {WEEKDAY_OPTIONS.map((day) => (
                  <label
                    key={day.value}
                    className="inline-flex items-center gap-2 text-sm text-ink"
                  >
                    <input
                      type="checkbox"
                      name="working_days"
                      value={day.value}
                      defaultChecked={school.workingDays.includes(day.value)}
                    />
                    {day.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <Feedback state={localeState} />
            <button
              type="submit"
              disabled={localePending}
              className="rounded-md border border-line bg-paper-elevated px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
            >
              {localePending ? "Saving…" : "Save locale settings"}
            </button>
          </form>

          <div className="mt-8 max-w-lg">
            <h3 className="text-sm font-medium text-ink">Holidays</h3>
            <ul className="mt-3 divide-y divide-line/70 border-y border-line/70">
              {holidays.length === 0 ? (
                <li className="py-3 text-sm text-muted">No holidays yet.</li>
              ) : (
                holidays.map((holiday) => (
                  <li
                    key={holiday.id}
                    className="flex items-center justify-between gap-3 py-3 text-sm"
                  >
                    <span>
                      {holiday.name}{" "}
                      <span className="text-muted">· {holiday.holidayDate}</span>
                    </span>
                    <form action={deleteAction}>
                      <input type="hidden" name="school_id" value={school.id} />
                      <input type="hidden" name="holiday_id" value={holiday.id} />
                      <button
                        type="submit"
                        disabled={deletePending}
                        className="text-ink underline-offset-2 hover:underline disabled:opacity-60"
                      >
                        Remove
                      </button>
                    </form>
                  </li>
                ))
              )}
            </ul>
            <form
              action={holidayAction}
              className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]"
              noValidate
            >
              <input type="hidden" name="school_id" value={school.id} />
              <input
                name="name"
                placeholder="Holiday name"
                required
                className="rounded-md border border-line bg-paper-elevated px-3 py-2 text-sm text-ink outline-none focus-visible:border-teal"
              />
              <input
                name="holiday_date"
                type="date"
                required
                className="rounded-md border border-line bg-paper-elevated px-3 py-2 text-sm text-ink outline-none focus-visible:border-teal"
              />
              <button
                type="submit"
                disabled={holidayPending}
                className="rounded-md border border-line bg-paper-elevated px-3 py-2 text-sm font-medium text-ink disabled:opacity-60"
              >
                Add
              </button>
            </form>
            <Feedback state={holidayState} />
            <Feedback state={deleteState} />
          </div>
        </>
      ) : (
        <p role="status" className="mt-6 text-sm text-muted">
          Only owners and admins can edit locale settings.
        </p>
      )}
    </section>
  );
}

export function SchoolCampusesPanel({
  schoolId,
  campuses,
  canManage,
}: {
  schoolId: string;
  campuses: SchoolCampusRecord[];
  canManage: boolean;
}) {
  const [createState, createAction, createPending] = useActionState(
    createSchoolCampusAction,
    initial,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateSchoolCampusAction,
    initial,
  );

  return (
    <section aria-labelledby="school-campuses-heading" className="mt-10">
      <h2
        id="school-campuses-heading"
        className="text-sm font-semibold tracking-wide text-ink uppercase"
      >
        Campuses
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        At least one active campus is required before setup can be completed.
      </p>
      <ul className="mt-6 space-y-6">
        {campuses.map((campus) => (
          <li key={campus.id} className="max-w-lg border-t border-line/70 pt-4">
            {canManage ? (
              <form action={updateAction} className="space-y-3" noValidate>
                <input type="hidden" name="school_id" value={schoolId} />
                <input type="hidden" name="campus_id" value={campus.id} />
                <Field label="Name" name="name" defaultValue={campus.name} required />
                <Field label="Code" name="code" defaultValue={campus.code ?? ""} />
                <Field label="Phone" name="phone" defaultValue={campus.phone ?? ""} />
                <Field
                  label="Email"
                  name="email"
                  type="email"
                  defaultValue={campus.email ?? ""}
                />
                <Field
                  label="Address"
                  name="address_line1"
                  defaultValue={campus.addressLine1 ?? ""}
                />
                <Field label="City" name="city" defaultValue={campus.city ?? ""} />
                <div className="space-y-1.5">
                  <label htmlFor={`status-${campus.id}`} className="block text-sm font-medium text-ink">
                    Status
                  </label>
                  <select
                    id={`status-${campus.id}`}
                    name="status"
                    defaultValue={campus.status}
                    className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
                  >
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={updatePending}
                  className="rounded-md border border-line bg-paper-elevated px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
                >
                  {updatePending ? "Saving…" : "Save campus"}
                </button>
              </form>
            ) : (
              <p className="text-sm text-ink">
                {campus.name}
                {campus.isDefault ? " (default)" : ""} · {campus.status}
              </p>
            )}
          </li>
        ))}
      </ul>
      {canManage ? (
        <form
          action={createAction}
          className="mt-8 max-w-lg space-y-3 border-t border-line/70 pt-6"
          noValidate
        >
          <h3 className="text-sm font-medium text-ink">Add campus</h3>
          <input type="hidden" name="school_id" value={schoolId} />
          <Field label="Name" name="name" required />
          <Field label="Code" name="code" />
          <Field label="Phone" name="phone" />
          <Field label="Email" name="email" type="email" />
          <Field label="Address" name="address_line1" />
          <Field label="City" name="city" />
          <Feedback state={createState} />
          <Feedback state={updateState} />
          <button
            type="submit"
            disabled={createPending}
            className="rounded-md border border-line bg-paper-elevated px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
          >
            {createPending ? "Creating…" : "Create campus"}
          </button>
        </form>
      ) : null}
    </section>
  );
}

export function CompleteSchoolSetupPanel({
  schoolId,
  canManage,
  needsSetup,
  hasActiveCampus,
}: {
  schoolId: string;
  canManage: boolean;
  needsSetup: boolean;
  hasActiveCampus: boolean;
}) {
  const [state, action, pending] = useActionState(
    completeSchoolSetupAction,
    initial,
  );

  if (!needsSetup) {
    return (
      <section aria-labelledby="complete-setup-heading" className="mt-12">
        <h2
          id="complete-setup-heading"
          className="text-sm font-semibold tracking-wide text-ink uppercase"
        >
          Setup status
        </h2>
        <p role="status" className="mt-3 text-sm text-teal">
          School setup is complete. This school is active.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="complete-setup-heading" className="mt-12">
      <h2
        id="complete-setup-heading"
        className="text-sm font-semibold tracking-wide text-ink uppercase"
      >
        Complete setup
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        When profile, locale, and at least one active campus look right, mark
        setup complete to open the school portal dashboard.
      </p>
      {canManage ? (
        <form action={action} className="mt-6 space-y-3">
          <input type="hidden" name="school_id" value={schoolId} />
          {!hasActiveCampus ? (
            <p role="status" className="text-sm text-muted">
              Add an active campus before completing setup.
            </p>
          ) : null}
          <Feedback state={state} />
          <button
            type="submit"
            disabled={pending || !hasActiveCampus}
            className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper-elevated disabled:opacity-60"
          >
            {pending ? "Completing…" : "Complete school setup"}
          </button>
        </form>
      ) : (
        <p role="status" className="mt-6 text-sm text-muted">
          Only owners and admins can complete school setup.
        </p>
      )}
    </section>
  );
}

function Field({
  label,
  name,
  defaultValue = "",
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
}) {
  const id = name;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
      />
    </div>
  );
}
