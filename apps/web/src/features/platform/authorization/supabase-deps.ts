import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { isOrgRole } from "./roles";
import type {
  AuthorizationDeps,
  MembershipStatus,
  TrustedMembership,
} from "./types";

/**
 * Builds AuthorizationDeps against the cookie session Supabase client.
 * Membership and campus rows are read under RLS — still re-check in authorize().
 */
export function createSupabaseAuthorizationDeps(
  supabase: SupabaseClient,
  options?: {
    /** When provided, skips a second getUser() round-trip. */
    user?: User | null;
    /** Prefer when only the verified session user id is already known. */
    userId?: string | null;
  },
): AuthorizationDeps {
  return {
    async getUserId() {
      if (options?.userId !== undefined) {
        return options.userId;
      }
      if (options && "user" in options) {
        return options.user?.id ?? null;
      }
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) {
        return null;
      }
      return user.id;
    },

    async getActiveMembership(userId, organizationId) {
      const { data, error } = await supabase
        .from("organization_memberships")
        .select("id, organization_id, user_id, role, status")
        .eq("user_id", userId)
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .maybeSingle();

      if (error || !data) {
        return null;
      }
      if (!isOrgRole(data.role)) {
        return null;
      }

      const membership: TrustedMembership = {
        id: data.id,
        organizationId: data.organization_id,
        userId: data.user_id,
        role: data.role,
        status: data.status as MembershipStatus,
      };
      return membership;
    },

    async getCampus(campusId) {
      const { data, error } = await supabase
        .from("campuses")
        .select("id, organization_id")
        .eq("id", campusId)
        .maybeSingle();

      if (error || !data) {
        return null;
      }
      return {
        id: data.id,
        organizationId: data.organization_id,
      };
    },

    async hasClassAssignment() {
      // Class/teacher assignment arrives with attendance modules. Fail closed.
      return false;
    },

    async hasGuardianStudentLink() {
      // Verified guardian–student links arrive in ILM-STU-002. Fail closed.
      return false;
    },
  };
}
