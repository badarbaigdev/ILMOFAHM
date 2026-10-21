export type AcademicYearStatus = "planned" | "active" | "archived";

export type AcademicYearInput = {
  name: string;
  startsOn: string;
  endsOn: string;
  status: AcademicYearStatus;
  makeCurrent: boolean;
};

export type AcademicTermInput = {
  name: string;
  startsOn: string;
  endsOn: string;
  sortOrder: number;
};

export type ValidateResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const STATUSES: readonly AcademicYearStatus[] = [
  "planned",
  "active",
  "archived",
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: string): Date | null {
  if (!DATE_RE.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function validateAcademicYearInput(raw: {
  name: string;
  startsOn: string;
  endsOn: string;
  status: string;
  makeCurrent?: boolean;
}): ValidateResult<AcademicYearInput> {
  const name = raw.name.trim();
  if (!name) {
    return { ok: false, error: "Academic year name is required." };
  }
  if (name.length > 120) {
    return { ok: false, error: "Name must be 120 characters or fewer." };
  }

  const startsOn = raw.startsOn.trim();
  const endsOn = raw.endsOn.trim();
  const start = parseDate(startsOn);
  const end = parseDate(endsOn);
  if (!start || !end) {
    return { ok: false, error: "Enter valid start and end dates (YYYY-MM-DD)." };
  }
  if (end < start) {
    return { ok: false, error: "End date must be on or after the start date." };
  }

  const status = raw.status.trim() as AcademicYearStatus;
  if (!STATUSES.includes(status)) {
    return { ok: false, error: "Select a valid status." };
  }

  return {
    ok: true,
    value: {
      name,
      startsOn,
      endsOn,
      status,
      makeCurrent: Boolean(raw.makeCurrent),
    },
  };
}

export function validateAcademicTermInput(raw: {
  name: string;
  startsOn: string;
  endsOn: string;
  sortOrder: string | number;
}): ValidateResult<AcademicTermInput> {
  const name = raw.name.trim();
  if (!name) {
    return { ok: false, error: "Term name is required." };
  }
  if (name.length > 120) {
    return { ok: false, error: "Name must be 120 characters or fewer." };
  }

  const startsOn = raw.startsOn.trim();
  const endsOn = raw.endsOn.trim();
  const start = parseDate(startsOn);
  const end = parseDate(endsOn);
  if (!start || !end) {
    return { ok: false, error: "Enter valid start and end dates (YYYY-MM-DD)." };
  }
  if (end < start) {
    return { ok: false, error: "End date must be on or after the start date." };
  }

  const sortOrder =
    typeof raw.sortOrder === "number"
      ? raw.sortOrder
      : Number.parseInt(String(raw.sortOrder).trim(), 10);
  if (!Number.isInteger(sortOrder) || sortOrder < 1) {
    return { ok: false, error: "Sort order must be a positive whole number." };
  }

  return {
    ok: true,
    value: { name, startsOn, endsOn, sortOrder },
  };
}
