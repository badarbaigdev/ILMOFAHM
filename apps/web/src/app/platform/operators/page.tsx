import { OperatorStatusForm } from "@/features/platform/operator/operator-status-form";
import { listPlatformOperators } from "@/features/platform/operator/queries";
import { requirePlatformOperatorPage } from "@/features/platform/operator/require-operator";

export default async function PlatformOperatorsPage() {
  const { supabase, user } = await requirePlatformOperatorPage(
    "platform.operators.read",
  );

  let operators;
  try {
    operators = await listPlatformOperators(supabase);
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl px-6 py-12 outline-none sm:px-10 sm:py-16"
      >
        <h1 className="font-display text-4xl tracking-tight text-ink">
          Platform operators
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load operators.
        </p>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-5xl px-6 py-12 outline-none sm:px-10 sm:py-16"
    >
      <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
        Superadmin
      </p>
      <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">
        Platform operators
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Active operators can suspend or revoke access. The last active operator
        cannot be removed. Status changes are audited.
      </p>

      {operators.length === 0 ? (
        <p className="mt-10 text-sm text-muted">No operators recorded.</p>
      ) : (
        <ul className="mt-10 divide-y divide-line/70 border-y border-line/70">
          {operators.map((operator) => (
            <li
              key={operator.userId}
              className="flex flex-col gap-3 py-5 sm:flex-row sm:items-start sm:justify-between"
            >
              <div>
                <p className="font-medium text-ink">
                  {operator.fullName ?? "Operator"}
                  {operator.userId === user.id ? (
                    <span className="ml-2 text-xs font-normal text-muted">
                      (you)
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 font-mono text-xs text-muted">
                  {operator.userId}
                </p>
                <p className="mt-2 text-sm text-ink-soft">
                  Role {operator.role} · Status{" "}
                  <span className="font-medium">{operator.status}</span>
                </p>
              </div>
              <OperatorStatusForm
                userId={operator.userId}
                currentStatus={operator.status}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
