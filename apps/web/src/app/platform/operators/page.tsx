import { PlatformOperatorsTable } from "@/features/platform/ui/platform-lists";
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
        className="mx-auto w-full max-w-6xl px-4 py-8 outline-none sm:px-6 lg:px-8"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
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
      className="mx-auto w-full max-w-6xl px-4 py-8 outline-none sm:px-6 lg:px-8"
    >
      <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
        Superadmin
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
        Platform operators
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Active operators can suspend or revoke access. The last active operator
        cannot be removed. Status changes are audited.
      </p>

      <div className="mt-8">
        <PlatformOperatorsTable
          operators={operators}
          currentUserId={user.id}
        />
      </div>
    </main>
  );
}
