export type CourseInput = {
  name: string;
  code: string | null;
  description: string | null;
};

export type CohortInput = {
  name: string;
  startsOn: string | null;
  endsOn: string | null;
  capacity: number | null;
  status: "planned" | "active" | "completed" | "archived";
};

export type ValidateResult<T> =
  { ok: true; value: T } | { ok: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const COHORT_STATUSES = ["planned", "active", "completed", "archived"] as const;

export function validateCourseInput(raw: {
  name: string;
  code: string;
  description: string;
}): ValidateResult<CourseInput> {
  const name = raw.name.trim();
  if (!name) return { ok: false, error: "Course name is required." };
  if (name.length > 160) {
    return { ok: false, error: "Name must be 160 characters or fewer." };
  }
  return {
    ok: true,
    value: {
      name,
      code: raw.code.trim() || null,
      description: raw.description.trim() || null,
    },
  };
}

export function validateCohortInput(raw: {
  name: string;
  startsOn: string;
  endsOn: string;
  capacity: string;
  status: string;
}): ValidateResult<CohortInput> {
  const name = raw.name.trim();
  if (!name) return { ok: false, error: "Cohort name is required." };
  if (name.length > 120) {
    return { ok: false, error: "Name must be 120 characters or fewer." };
  }

  const startsOn = raw.startsOn.trim() || null;
  const endsOn = raw.endsOn.trim() || null;
  if (startsOn && !DATE_RE.test(startsOn)) {
    return { ok: false, error: "Enter a valid start date (YYYY-MM-DD)." };
  }
  if (endsOn && !DATE_RE.test(endsOn)) {
    return { ok: false, error: "Enter a valid end date (YYYY-MM-DD)." };
  }
  if (startsOn && endsOn && endsOn < startsOn) {
    return { ok: false, error: "End date must be on or after the start date." };
  }

  const capacityRaw = raw.capacity.trim();
  let capacity: number | null = null;
  if (capacityRaw) {
    capacity = Number.parseInt(capacityRaw, 10);
    if (!Number.isInteger(capacity) || capacity < 1) {
      return { ok: false, error: "Capacity must be a positive whole number." };
    }
  }

  const status = raw.status.trim() as CohortInput["status"];
  if (!COHORT_STATUSES.includes(status)) {
    return { ok: false, error: "Select a valid status." };
  }

  return {
    ok: true,
    value: { name, startsOn, endsOn, capacity, status },
  };
}
