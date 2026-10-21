export type GradeInput = {
  name: string;
  code: string | null;
  sortOrder: number;
};

export type SectionInput = {
  name: string;
  capacity: number | null;
};

export type SubjectInput = {
  name: string;
  code: string | null;
};

export type ValidateResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function validateGradeInput(raw: {
  name: string;
  code: string;
  sortOrder: string | number;
}): ValidateResult<GradeInput> {
  const name = raw.name.trim();
  if (!name) return { ok: false, error: "Grade name is required." };
  if (name.length > 120) {
    return { ok: false, error: "Name must be 120 characters or fewer." };
  }
  const code = raw.code.trim() || null;
  const sortOrder =
    typeof raw.sortOrder === "number"
      ? raw.sortOrder
      : Number.parseInt(String(raw.sortOrder).trim(), 10);
  if (!Number.isInteger(sortOrder) || sortOrder < 1) {
    return { ok: false, error: "Sort order must be a positive whole number." };
  }
  return { ok: true, value: { name, code, sortOrder } };
}

export function validateSectionInput(raw: {
  name: string;
  capacity: string;
}): ValidateResult<SectionInput> {
  const name = raw.name.trim();
  if (!name) return { ok: false, error: "Section name is required." };
  if (name.length > 120) {
    return { ok: false, error: "Name must be 120 characters or fewer." };
  }
  const capacityRaw = raw.capacity.trim();
  let capacity: number | null = null;
  if (capacityRaw) {
    capacity = Number.parseInt(capacityRaw, 10);
    if (!Number.isInteger(capacity) || capacity < 1) {
      return { ok: false, error: "Capacity must be a positive whole number." };
    }
  }
  return { ok: true, value: { name, capacity } };
}

export function validateSubjectInput(raw: {
  name: string;
  code: string;
}): ValidateResult<SubjectInput> {
  const name = raw.name.trim();
  if (!name) return { ok: false, error: "Subject name is required." };
  if (name.length > 120) {
    return { ok: false, error: "Name must be 120 characters or fewer." };
  }
  const code = raw.code.trim() || null;
  return { ok: true, value: { name, code } };
}
