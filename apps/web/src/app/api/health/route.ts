import { getHealthPayload } from "@/lib/health";

export const dynamic = "force-dynamic";

/**
 * Lightweight liveness response. No DB probes, no env dumps, no stack traces.
 */
export async function GET() {
  return Response.json(getHealthPayload(), {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
