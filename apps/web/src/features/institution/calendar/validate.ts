import {
  type OrganizationLocale,
  type OrganizationTimezone,
  isOrganizationLocale,
  isOrganizationTimezone,
} from "./options";

export type LocaleSettingsInput = {
  timezone: OrganizationTimezone;
  locale: OrganizationLocale;
  workingDays: number[];
};

export type LocaleSettingsValidation =
  { ok: true; value: LocaleSettingsInput } | { ok: false; error: string };

export type HolidayInput = {
  name: string;
  holidayDate: string;
};

export type HolidayValidation =
  { ok: true; value: HolidayInput } | { ok: false; error: string };

export function validateLocaleSettingsInput(input: {
  timezone: string;
  locale: string;
  workingDays: number[];
}): LocaleSettingsValidation {
  const timezone = input.timezone.trim();
  const locale = input.locale.trim();

  if (!isOrganizationTimezone(timezone)) {
    return { ok: false, error: "Choose a supported timezone." };
  }
  if (!isOrganizationLocale(locale)) {
    return { ok: false, error: "Choose English or Urdu." };
  }

  const uniqueDays = [
    ...new Set(
      input.workingDays.filter(
        (day) => Number.isInteger(day) && day >= 1 && day <= 7,
      ),
    ),
  ].sort((a, b) => a - b);

  if (uniqueDays.length < 1) {
    return { ok: false, error: "Select at least one working day." };
  }

  return {
    ok: true,
    value: { timezone, locale, workingDays: uniqueDays },
  };
}

export function validateHolidayInput(input: {
  name: string;
  holidayDate: string;
}): HolidayValidation {
  const name = input.name.trim();
  const holidayDate = input.holidayDate.trim();

  if (name.length < 1) {
    return { ok: false, error: "Enter a holiday name." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(holidayDate)) {
    return { ok: false, error: "Choose a valid holiday date." };
  }

  return { ok: true, value: { name, holidayDate } };
}
