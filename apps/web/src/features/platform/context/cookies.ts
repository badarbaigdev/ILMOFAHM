import "server-only";

import { cookies } from "next/headers";

import {
  CAMPUS_CONTEXT_COOKIE,
  ORG_CONTEXT_COOKIE,
} from "@/features/platform/context/types";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
};

export async function readContextCookies(): Promise<{
  organizationId: string | null;
  campusId: string | null;
}> {
  const jar = await cookies();
  return {
    organizationId: jar.get(ORG_CONTEXT_COOKIE)?.value ?? null,
    campusId: jar.get(CAMPUS_CONTEXT_COOKIE)?.value ?? null,
  };
}

export async function writeContextCookies(input: {
  organizationId: string;
  campusId: string | null;
}): Promise<void> {
  const jar = await cookies();
  jar.set(ORG_CONTEXT_COOKIE, input.organizationId, COOKIE_OPTIONS);
  if (input.campusId) {
    jar.set(CAMPUS_CONTEXT_COOKIE, input.campusId, COOKIE_OPTIONS);
  } else {
    jar.delete(CAMPUS_CONTEXT_COOKIE);
  }
}

export async function clearContextCookies(): Promise<void> {
  const jar = await cookies();
  jar.delete(ORG_CONTEXT_COOKIE);
  jar.delete(CAMPUS_CONTEXT_COOKIE);
}
