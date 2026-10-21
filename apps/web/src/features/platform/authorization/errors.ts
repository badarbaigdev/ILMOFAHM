export type AuthorizationDenialCode =
  | "unauthenticated"
  | "forbidden"
  | "not_a_member"
  | "missing_permission"
  | "invalid_scope"
  | "cross_tenant_scope";

/**
 * Stable authorization failure. Message is safe to show to the caller;
 * never embed other tenants' names or IDs.
 */
export class AuthorizationError extends Error {
  readonly code: AuthorizationDenialCode;

  constructor(code: AuthorizationDenialCode, message: string) {
    super(message);
    this.name = "AuthorizationError";
    this.code = code;
  }
}

export function isAuthorizationError(
  error: unknown,
): error is AuthorizationError {
  return error instanceof AuthorizationError;
}
