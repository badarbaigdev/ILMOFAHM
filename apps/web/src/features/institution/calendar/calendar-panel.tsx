"use client";

import { useActionState } from "react";

import {
  type CalendarActionState,
  createHolidayAction,
  deleteHolidayAction,
  updateLocaleSettingsAction,
} from "@/features/institution/calendar/actions";
import {
  ORGANIZATION_LOCALES,
  ORGANIZATION_TIMEZONES,
  WEEKDAY_OPTIONS,
  localeLabel,
} from "@/features/institution/calendar/options";
import type { OrganizationHolidayRow } from "@/features/institution/calendar/queries";

const initialState: CalendarActionState = { error: null, success: null };

type CalendarPanelProps = {
  organizationId: string;
  timezone: string;
  locale: string;
  workingDays: number[];
  holidays: OrganizationHolidayRow[];
  canUpdate: boolean;
};

function LocaleSettingsForm({
  organizationId,
  timezone,
  locale,
  workingDays,
}: {
  organizationId: string;
  timezone: string;
  locale: string;
  workingDays: number[];
}) {
  const [state, formAction, pending] = useActionState(
    updateLocaleSettingsAction,
    initialState,
  );
  const selected = new Set(workingDays);

  return (
    <form action={formAction} className="mt-4 max-w-md space-y-4" noValidate>
      <input type="hidden" name="organization_id" value={organizationId} />

      <div className="space-y-1.5">
        <label
          htmlFor="org-timezone"
          className="block text-sm font-medium text-ink"
        >
          Timezone
        </label>
        <select
          id="org-timezone"
          name="timezone"
          required
          defaultValue={timezone}
          className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
        >
          {ORGANIZATION_TIMEZONES.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="org-locale"
          className="block text-sm font-medium text-ink"
        >
          Default language
        </label>
        <select
          id="org-locale"
          name="locale"
          required
          defaultValue={locale}
          className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
        >
          {ORGANIZATION_LOCALES.map((code) => (
            <option key={code} value={code}>
              {localeLabel(code)}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-ink">Working days</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {WEEKDAY_OPTIONS.map((day) => (
            <label
              key={day.value}
              className="flex items-center gap-2 text-sm text-ink-soft"
            >
              <input
                type="checkbox"
                name="working_days"
                value={day.value}
                defaultChecked={selected.has(day.value)}
                className="rounded border-line"
              />
              {day.label}
            </label>
          ))}
        </div>
      </fieldset>

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
        className="rounded-md border border-line bg-paper-elevated px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save locale settings"}
      </button>
    </form>
  );
}

function HolidaysSection({
  organizationId,
  holidays,
  canUpdate,
}: {
  organizationId: string;
  holidays: OrganizationHolidayRow[];
  canUpdate: boolean;
}) {
  const [createState, createAction, createPending] = useActionState(
    createHolidayAction,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteHolidayAction,
    initialState,
  );

  return (
    <div className="mt-10">
      <h3 className="text-sm font-semibold tracking-wide text-ink uppercase">
        Holidays
      </h3>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Named calendar dates for this organization. Academic years and terms
        arrive in a later milestone.
      </p>

      {holidays.length === 0 ? (
        <p role="status" className="mt-4 text-sm text-muted">
          No holidays configured yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {holidays.map((holiday) => (
            <li
              key={holiday.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-soft"
            >
              <span className="font-medium text-ink">{holiday.name}</span>
              <span className="font-mono text-xs">{holiday.holidayDate}</span>
              {canUpdate ? (
                <form action={deleteAction}>
                  <input
                    type="hidden"
                    name="organization_id"
                    value={organizationId}
                  />
                  <input type="hidden" name="holiday_id" value={holiday.id} />
                  <button
                    type="submit"
                    disabled={deletePending}
                    className="text-sm text-red-700 underline disabled:opacity-60"
                  >
                    Remove
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {deleteState.error ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {deleteState.error}
        </p>
      ) : null}
      {deleteState.success ? (
        <p role="status" className="mt-2 text-sm text-teal">
          {deleteState.success}
        </p>
      ) : null}

      {canUpdate ? (
        <form
          action={createAction}
          className="mt-6 max-w-md space-y-3"
          noValidate
        >
          <input type="hidden" name="organization_id" value={organizationId} />
          <div className="space-y-1.5">
            <label
              htmlFor="holiday-name"
              className="block text-sm font-medium text-ink"
            >
              Holiday name
            </label>
            <input
              id="holiday-name"
              name="name"
              type="text"
              required
              className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="holiday-date"
              className="block text-sm font-medium text-ink"
            >
              Date
            </label>
            <input
              id="holiday-date"
              name="holiday_date"
              type="date"
              required
              className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
            />
          </div>
          {createState.error ? (
            <p role="alert" className="text-sm text-red-700">
              {createState.error}
            </p>
          ) : null}
          {createState.success ? (
            <p role="status" className="text-sm text-teal">
              {createState.success}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={createPending}
            className="rounded-md border border-line bg-paper-elevated px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
          >
            {createPending ? "Adding…" : "Add holiday"}
          </button>
        </form>
      ) : null}
    </div>
  );
}

export function CalendarPanel({
  organizationId,
  timezone,
  locale,
  workingDays,
  holidays,
  canUpdate,
}: CalendarPanelProps) {
  const dayLabels = WEEKDAY_OPTIONS.filter((day) =>
    workingDays.includes(day.value),
  )
    .map((day) => day.label)
    .join(", ");

  return (
    <section aria-labelledby="calendar-heading" className="mt-14">
      <h2
        id="calendar-heading"
        className="text-sm font-semibold tracking-wide text-ink uppercase"
      >
        Locale and calendar
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Timezone and language defaults for this institution, plus working days
        and holiday placeholders.
      </p>

      {!canUpdate ? (
        <dl className="mt-4 grid gap-2 text-sm text-ink-soft sm:grid-cols-2">
          <div>
            <dt className="text-xs tracking-wide text-muted uppercase">
              Timezone
            </dt>
            <dd className="text-ink">{timezone}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-muted uppercase">
              Language
            </dt>
            <dd className="text-ink">
              {locale === "ur" || locale === "en"
                ? localeLabel(locale)
                : locale}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs tracking-wide text-muted uppercase">
              Working days
            </dt>
            <dd className="text-ink">{dayLabels || "—"}</dd>
          </div>
        </dl>
      ) : (
        <LocaleSettingsForm
          organizationId={organizationId}
          timezone={timezone}
          locale={locale}
          workingDays={workingDays}
        />
      )}

      {!canUpdate ? (
        <p role="status" className="mt-4 text-sm text-muted">
          Only owners and admins can change locale and calendar settings.
        </p>
      ) : null}

      <HolidaysSection
        organizationId={organizationId}
        holidays={holidays}
        canUpdate={canUpdate}
      />
    </section>
  );
}
