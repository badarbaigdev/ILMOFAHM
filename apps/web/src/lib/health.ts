/**
 * Non-sensitive health payload for operators and uptime checks.
 * Never include env vars, keys, DB URLs, or stack traces here.
 */

export type HealthStatus = "ok";

export type HealthPayload = {
  status: HealthStatus;
  service: "ilmofahm-web";
  timestamp: string;
};

export function getHealthPayload(
  now: () => Date = () => new Date(),
): HealthPayload {
  return {
    status: "ok",
    service: "ilmofahm-web",
    timestamp: now().toISOString(),
  };
}
