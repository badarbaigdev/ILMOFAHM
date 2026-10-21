export { authorize, can } from "@/features/platform/authorization/authorize";
export {
  AuthorizationError,
  isAuthorizationError,
} from "@/features/platform/authorization/errors";
export {
  PERMISSIONS,
  permissionsForRole,
  roleHasPermission,
  type Permission,
} from "@/features/platform/authorization/permissions";
export {
  ORG_ROLES,
  isOrgRole,
  type OrgRole,
} from "@/features/platform/authorization/roles";
export { createSupabaseAuthorizationDeps } from "@/features/platform/authorization/supabase-deps";
export type {
  AuthContext,
  AuthorizationDeps,
  AuthorizationScope,
  AuthorizeRequest,
  TrustedCampus,
  TrustedMembership,
} from "@/features/platform/authorization/types";
