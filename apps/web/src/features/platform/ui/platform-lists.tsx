"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  DialogField,
  DialogSelect,
  FormDialog,
} from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import {
  setPlatformOperatorStatusAction,
  type PlatformOperatorStatusActionState,
} from "@/features/platform/operator/actions";
import type { PlatformOperatorRow } from "@/features/platform/operator/queries";
import { assignSchoolSubscriptionAction } from "@/features/platform/subscriptions/actions";
import type {
  SchoolSubscriptionRow,
  SubscriptionPlanRow,
} from "@/features/platform/subscriptions/queries";
import type { SchoolApplicationListItem } from "@/features/school-applications/queries";
import { schoolApplicationStatusLabel } from "@/features/school-applications/transitions";
import {
  institutionTypeLabel,
  isInstitutionType,
} from "@/features/institution/mode";
import type { PlatformSchoolRow } from "@/features/schools/platform-queries";
import {
  PersonCell,
  SchoolDataTable,
  StatusBadge,
  formatListDate,
} from "@/features/schools/ui/data-table";

type SubscriptionActionState = { error: string | null; success: string | null };
const subscriptionInitial: SubscriptionActionState = {
  error: null,
  success: null,
};
const operatorInitial: PlatformOperatorStatusActionState = {
  error: null,
  success: null,
};

export function PlatformRequestsTable({
  applications,
}: {
  applications: SchoolApplicationListItem[];
}) {
  return (
    <SchoolDataTable
      rows={applications}
      rowKey={(row) => row.id}
      searchPlaceholder="Search requests"
      searchText={(row) =>
        [
          row.schoolName,
          row.applicantName,
          row.applicantEmail,
          row.city ?? "",
          row.status,
          row.institutionType,
        ].join(" ")
      }
      emptyMessage="No applications match this filter."
      exportFileName="school-requests"
      columns={[
        {
          id: "school",
          header: "School",
          cell: (row) => (
            <Link
              href={`/platform/requests/${row.id}`}
              className="font-medium text-teal no-underline hover:underline"
            >
              {row.schoolName}
            </Link>
          ),
        },
        {
          id: "applicant",
          header: "Applicant",
          cell: (row) => (
            <PersonCell name={row.applicantName} secondary={row.applicantEmail} />
          ),
        },
        {
          id: "type",
          header: "Type",
          cell: (row) =>
            isInstitutionType(row.institutionType)
              ? institutionTypeLabel(row.institutionType)
              : row.institutionType,
        },
        {
          id: "city",
          header: "City",
          cell: (row) => row.city ?? "—",
        },
        {
          id: "submitted",
          header: "Submitted",
          cell: (row) => formatListDate(row.createdAt.slice(0, 10)),
        },
        {
          id: "status",
          header: "Status",
          cell: (row) => (
            <StatusBadge status={row.status} />
          ),
        },
        {
          id: "action",
          header: "Action",
          cell: (row) => (
            <Link
              href={`/platform/requests/${row.id}`}
              className="text-sm text-teal no-underline hover:underline"
            >
              Review
            </Link>
          ),
        },
      ]}
    />
  );
}

export function PlatformSchoolsTable({
  schools,
}: {
  schools: PlatformSchoolRow[];
}) {
  return (
    <SchoolDataTable
      rows={schools}
      rowKey={(row) => row.id}
      searchPlaceholder="Search schools"
      searchText={(row) =>
        [
          row.name,
          row.slug ?? "",
          row.city ?? "",
          row.status,
          row.institutionType,
          row.defaultCampusName ?? "",
        ].join(" ")
      }
      filterOptions={[
        { value: "active", label: "Active" },
        { value: "pending_setup", label: "Pending setup" },
        { value: "suspended", label: "Suspended" },
      ]}
      filterValue={(row) => row.status}
      emptyMessage="No schools yet."
      exportFileName="platform-schools"
      columns={[
        {
          id: "name",
          header: "School",
          cell: (row) => (
            <Link
              href={`/platform/schools/${row.id}`}
              className="no-underline"
            >
              <PersonCell
                name={row.name}
                secondary={row.slug ? `/${row.slug}` : row.id.slice(0, 8)}
              />
            </Link>
          ),
        },
        {
          id: "type",
          header: "Type",
          cell: (row) =>
            isInstitutionType(row.institutionType)
              ? institutionTypeLabel(row.institutionType)
              : row.institutionType,
        },
        {
          id: "campus",
          header: "Campus",
          cell: (row) => row.defaultCampusName ?? "—",
        },
        {
          id: "invite",
          header: "Owner invite",
          cell: (row) => row.ownerInvitationStatus ?? "—",
        },
        {
          id: "status",
          header: "Status",
          cell: (row) => <StatusBadge status={row.status} />,
        },
        {
          id: "action",
          header: "Action",
          cell: (row) => (
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/platform/schools/${row.id}`}
                className="text-sm text-teal no-underline hover:underline"
              >
                Manage
              </Link>
              {row.applicationId ? (
                <Link
                  href={`/platform/requests/${row.applicationId}`}
                  className="text-sm text-muted no-underline hover:underline"
                >
                  Application
                </Link>
              ) : null}
            </div>
          ),
        },
      ]}
    />
  );
}

export function PlatformPlansTable({ plans }: { plans: SubscriptionPlanRow[] }) {
  return (
    <SchoolDataTable
      rows={plans}
      rowKey={(row) => row.id}
      searchPlaceholder="Search plans"
      searchText={(row) =>
        [row.name, row.summary, row.billingInterval, row.id].join(" ")
      }
      emptyMessage="No plans configured."
      exportFileName="subscription-plans"
      selectable={false}
      columns={[
        {
          id: "name",
          header: "Plan",
          cell: (row) => (
            <div>
              <p className="font-medium text-ink">{row.name}</p>
              <p className="text-xs text-muted">{row.summary}</p>
            </div>
          ),
        },
        {
          id: "interval",
          header: "Billing",
          cell: (row) => (
            <span className="capitalize">{row.billingInterval}</span>
          ),
        },
        {
          id: "price",
          header: "Example price",
          cell: (row) =>
            row.exampleAmount != null
              ? `${row.exampleAmount} ${row.currencyCode}`
              : "Contact",
        },
        {
          id: "visibility",
          header: "Visibility",
          cell: (row) => (row.isPublic ? "Public" : "Private"),
        },
        {
          id: "status",
          header: "Status",
          cell: (row) => (
            <StatusBadge status={row.isActive ? "active" : "inactive"} />
          ),
        },
      ]}
    />
  );
}

export function PlatformSubscriptionsTable({
  subscriptions,
}: {
  subscriptions: SchoolSubscriptionRow[];
}) {
  return (
    <SchoolDataTable
      rows={subscriptions}
      rowKey={(row) => row.id}
      searchPlaceholder="Search subscriptions"
      searchText={(row) =>
        [
          row.schoolName,
          row.planName,
          row.status,
          row.billingContactEmail ?? "",
        ].join(" ")
      }
      emptyMessage="No subscriptions match this filter."
      exportFileName="school-subscriptions"
      columns={[
        {
          id: "school",
          header: "School",
          cell: (row) => (
            <Link
              href={`/platform/subscriptions/${row.id}`}
              className="font-medium text-teal no-underline hover:underline"
            >
              {row.schoolName}
            </Link>
          ),
        },
        {
          id: "plan",
          header: "Plan",
          cell: (row) => (
            <span>
              {row.planName}{" "}
              <span className="text-muted">· {row.billingInterval}</span>
            </span>
          ),
        },
        {
          id: "billing",
          header: "Billing contact",
          cell: (row) => row.billingContactEmail ?? "—",
        },
        {
          id: "status",
          header: "Status",
          cell: (row) => <StatusBadge status={row.status} />,
        },
        {
          id: "action",
          header: "Action",
          cell: (row) => (
            <Link
              href={`/platform/subscriptions/${row.id}`}
              className="text-sm text-teal no-underline hover:underline"
            >
              Manage
            </Link>
          ),
        },
      ]}
    />
  );
}

export function AssignSubscriptionButton({
  schools,
  plans,
}: {
  schools: Array<{ id: string; name: string }>;
  plans: SubscriptionPlanRow[];
}) {
  const [state, action, pending] = useActionState(
    assignSchoolSubscriptionAction,
    subscriptionInitial,
  );
  const dialog = useActionDialog(state);

  return (
    <>
      <button
        type="button"
        onClick={dialog.openDialog}
        className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white"
      >
        + Assign subscription
      </button>
      <FormDialog
        open={dialog.open}
        onClose={dialog.closeDialog}
        title="Assign or replace subscription"
        description="Creates a new current subscription and marks any previous current row as historical."
        submitLabel="Assign subscription"
        formAction={action}
        busy={pending}
        dirty={dialog.dirty}
        onDirtyChange={dialog.setDirty}
        error={state.error}
      >
        <DialogSelect
          id="school_id"
          name="school_id"
          label="School"
          required
          disabled={schools.length === 0}
          options={schools.map((s) => ({ value: s.id, label: s.name }))}
        />
        <DialogSelect
          id="plan_id"
          name="plan_id"
          label="Plan"
          required
          options={plans
            .filter((p) => p.isActive)
            .map((p) => ({ value: p.id, label: p.name }))}
        />
        <DialogSelect
          id="status"
          name="status"
          label="Status"
          required
          defaultValue="active"
          options={[
            { value: "trial", label: "Trial" },
            { value: "active", label: "Active" },
            { value: "past_due", label: "Past due" },
            { value: "grace", label: "Grace" },
            { value: "suspended", label: "Suspended" },
            { value: "cancelled", label: "Cancelled" },
            { value: "expired", label: "Expired" },
          ]}
        />
        <DialogField
          id="billing_contact_name"
          name="billing_contact_name"
          label="Billing contact name"
        />
        <DialogField
          id="billing_contact_email"
          name="billing_contact_email"
          label="Billing contact email"
          type="email"
        />
        <DialogField id="notes" name="notes" label="Notes" />
      </FormDialog>
    </>
  );
}

export function PlatformOperatorsTable({
  operators,
  currentUserId,
}: {
  operators: PlatformOperatorRow[];
  currentUserId: string;
}) {
  return (
    <SchoolDataTable
      rows={operators}
      rowKey={(row) => row.userId}
      searchPlaceholder="Search operators"
      searchText={(row) =>
        [row.fullName ?? "", row.role, row.status, row.userId].join(" ")
      }
      filterOptions={[
        { value: "active", label: "Active" },
        { value: "suspended", label: "Suspended" },
        { value: "revoked", label: "Revoked" },
      ]}
      filterValue={(row) => row.status}
      emptyMessage="No operators recorded."
      exportFileName="platform-operators"
      columns={[
        {
          id: "name",
          header: "Operator",
          cell: (row) => (
            <PersonCell
              name={`${row.fullName ?? "Operator"}${row.userId === currentUserId ? " (you)" : ""}`}
              secondary={row.userId}
            />
          ),
        },
        {
          id: "role",
          header: "Role",
          cell: (row) => <span className="capitalize">{row.role}</span>,
        },
        {
          id: "status",
          header: "Status",
          cell: (row) => <StatusBadge status={row.status} />,
        },
        {
          id: "action",
          header: "Action",
          cell: (row) => (
            <OperatorStatusActions
              userId={row.userId}
              currentStatus={row.status}
            />
          ),
        },
      ]}
    />
  );
}

function OperatorStatusActions({
  userId,
  currentStatus,
}: {
  userId: string;
  currentStatus: string;
}) {
  const [state, formAction, pending] = useActionState(
    setPlatformOperatorStatusAction,
    operatorInitial,
  );
  const dialog = useActionDialog(state);
  const [nextStatus, setNextStatus] = useState<string | null>(null);

  const actions =
    currentStatus === "active"
      ? ([
          { status: "suspended", label: "Suspend" },
          { status: "revoked", label: "Revoke" },
        ] as const)
      : ([{ status: "active", label: "Reactivate" }] as const);

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action.status}
          type="button"
          onClick={() => {
            setNextStatus(action.status);
            dialog.openDialog();
          }}
          className={
            action.status === "active"
              ? "text-sm text-teal underline-offset-2 hover:underline"
              : "text-sm text-red-700 underline-offset-2 hover:underline"
          }
        >
          {action.label}
        </button>
      ))}
      <FormDialog
        open={dialog.open && nextStatus !== null}
        onClose={() => {
          dialog.closeDialog();
          setNextStatus(null);
        }}
        title={
          nextStatus === "active"
            ? "Reactivate operator"
            : nextStatus === "suspended"
              ? "Suspend operator"
              : "Revoke operator"
        }
        description={
          nextStatus === "active"
            ? "Restore platform access for this operator?"
            : nextStatus === "suspended"
              ? "Suspend this operator? They will lose platform access immediately."
              : "Revoke this operator permanently? The last active operator cannot be removed."
        }
        submitLabel={
          nextStatus === "active"
            ? "Reactivate"
            : nextStatus === "suspended"
              ? "Suspend"
              : "Revoke"
        }
        formAction={formAction}
        busy={pending}
        error={state.error}
        tone={nextStatus === "active" ? "default" : "danger"}
      >
        <input type="hidden" name="user_id" value={userId} />
        <input type="hidden" name="status" value={nextStatus ?? ""} />
      </FormDialog>
    </div>
  );
}

// Re-export helper for pages that still show status labels.
export { schoolApplicationStatusLabel };
