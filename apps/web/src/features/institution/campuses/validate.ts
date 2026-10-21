export type CampusProfileInput = {
  name: string;
  code: string | null;
  phone: string | null;
  email: string | null;
  addressLine: string | null;
  status: "active" | "archived";
};

export type CampusProfileValidation =
  { ok: true; value: CampusProfileInput } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function optionalTrim(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function validateCampusProfileInput(input: {
  name: string;
  code?: string;
  phone?: string;
  email?: string;
  addressLine?: string;
  status?: string;
}): CampusProfileValidation {
  const name = input.name.trim();
  if (name.length < 1) {
    return { ok: false, error: "Enter a campus name." };
  }

  const email = optionalTrim(input.email ?? "");
  if (email && !EMAIL_RE.test(email)) {
    return {
      ok: false,
      error: "Enter a valid campus email, or leave it blank.",
    };
  }

  const statusRaw = (input.status ?? "active").trim();
  if (statusRaw !== "active" && statusRaw !== "archived") {
    return { ok: false, error: "Choose active or archived." };
  }

  return {
    ok: true,
    value: {
      name,
      code: optionalTrim(input.code ?? ""),
      phone: optionalTrim(input.phone ?? ""),
      email: email ? email.toLowerCase() : null,
      addressLine: optionalTrim(input.addressLine ?? ""),
      status: statusRaw,
    },
  };
}
