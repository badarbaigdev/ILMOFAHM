const SECRET_KEY_PATTERN =
  /(password|secret|token|authorization|cookie|api[_-]?key|private[_-]?key|access[_-]?token|refresh[_-]?token|credit[_-]?card|ssn|session)/i;

const EMAIL_KEYS = new Set(["email", "invitee_email", "actor_email"]);

function redactEmail(value: string): string {
  const at = value.indexOf("@");
  if (at > 0) {
    return `${value.slice(0, 1)}***${value.slice(at)}`;
  }
  return "[redacted]";
}

/**
 * Strip secret-like keys and redact emails before audit persistence.
 * Mirrors public.sanitize_audit_metadata in SQL.
 */
export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      continue;
    }

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      result[key] = sanitizeAuditMetadata(value as Record<string, unknown>);
      continue;
    }

    if (EMAIL_KEYS.has(key.toLowerCase()) && typeof value === "string") {
      result[key] = redactEmail(value);
      continue;
    }

    result[key] = value;
  }

  return result;
}
