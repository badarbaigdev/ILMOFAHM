"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  type SchoolGuardianActionState,
  updateSchoolGuardianAction,
} from "@/features/schools/guardians/actions";
import type { SchoolGuardianRow } from "@/features/schools/guardians/queries";
import {
  PersonAvatar,
  StatusBadge,
} from "@/features/schools/ui/data-table";

const initial: SchoolGuardianActionState = { error: null, success: null };

export type GuardianStudentLink = {
  studentId: string;
  name: string;
  studentNumber: string;
  relationship: string;
  isPrimary: boolean;
  photoUrl?: string | null;
};

type Props = {
  schoolId: string;
  guardian: SchoolGuardianRow;
  students: GuardianStudentLink[];
  canManage: boolean;
};

export function SchoolGuardianProfilePanel({
  schoolId,
  guardian,
  students,
  canManage,
}: Props) {
  const [state, action, pending] = useActionState(
    updateSchoolGuardianAction,
    initial,
  );
  const fullName = `${guardian.firstName} ${guardian.lastName}`;
  const schoolQuery = `school=${encodeURIComponent(schoolId)}`;
  const idCardHref = `/school/guardians/${guardian.id}/id-card?${schoolQuery}`;
  const primaryRelationship =
    students.find((s) => s.isPrimary)?.relationship ??
    students[0]?.relationship ??
    "—";

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line bg-paper-elevated p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <PersonAvatar
            name={fullName}
            photoUrl={guardian.photoUrl}
            size="lg"
            className="!h-20 !w-20 !rounded-2xl"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-ink">
                {fullName}
              </h1>
              <StatusBadge status={guardian.status} />
            </div>
            <p className="mt-1 text-sm text-muted">
              {guardian.email ?? "No email on file"}
              {primaryRelationship !== "—" ? (
                <>
                  <span className="mx-1.5 text-line">·</span>
                  <span className="capitalize">{primaryRelationship}</span>
                </>
              ) : null}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={idCardHref}
                className="rounded-md border border-line bg-paper px-3 py-1.5 text-sm font-medium text-ink no-underline hover:border-teal"
              >
                Print ID card
              </Link>
              <Link
                href={`/school/guardians?${schoolQuery}`}
                className="rounded-md px-3 py-1.5 text-sm text-muted no-underline hover:text-ink"
              >
                Back to guardians
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileSection title="Personal">
          <DlRow label="First name" value={guardian.firstName} />
          <DlRow label="Last name" value={guardian.lastName} />
          <DlRow label="Status" value={<StatusBadge status={guardian.status} />} />
        </ProfileSection>

        <ProfileSection title="Contact">
          <DlRow label="Email" value={guardian.email ?? "—"} />
          <DlRow label="Phone" value={guardian.phone ?? "—"} />
          <DlRow
            label="Relationship"
            value={
              <span className="capitalize">{primaryRelationship}</span>
            }
          />
        </ProfileSection>
      </div>

      <ProfileSection title="Linked students">
        {students.length === 0 ? (
          <p className="text-sm text-muted">No linked students.</p>
        ) : (
          <ul className="divide-y divide-line/70">
            {students.map((s) => (
              <li
                key={s.studentId}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <Link
                  href={`/school/students/${s.studentId}?${schoolQuery}`}
                  className="flex min-w-0 items-center gap-2.5 no-underline hover:opacity-90"
                >
                  <PersonAvatar name={s.name} photoUrl={s.photoUrl} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-teal">
                      {s.name}
                    </span>
                    <span className="block text-xs text-muted">
                      {s.studentNumber}
                      <span className="mx-1">·</span>
                      <span className="capitalize">{s.relationship}</span>
                      {s.isPrimary ? " · primary" : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </ProfileSection>

      {canManage ? (
        <section
          aria-labelledby="edit-guardian-heading"
          className="rounded-2xl border border-line bg-paper-elevated p-5 sm:p-6"
        >
          <h2
            id="edit-guardian-heading"
            className="text-sm font-semibold tracking-wide text-ink uppercase"
          >
            Edit profile
          </h2>
          <p className="mt-1 text-sm text-muted">
            Update guardian contact details and optional photo.
          </p>
          <form action={action} className="mt-6 max-w-xl space-y-4" noValidate>
            <input type="hidden" name="school_id" value={schoolId} />
            <input type="hidden" name="guardian_id" value={guardian.id} />
            <input
              type="hidden"
              name="photo_url"
              value={guardian.photoUrl ?? ""}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="First name"
                name="first_name"
                defaultValue={guardian.firstName}
                required
              />
              <Field
                label="Last name"
                name="last_name"
                defaultValue={guardian.lastName}
                required
              />
              <Field
                label="Email"
                name="email"
                type="email"
                defaultValue={guardian.email ?? ""}
              />
              <Field
                label="Phone"
                name="phone"
                defaultValue={guardian.phone ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="guardian-photo"
                className="block text-sm font-medium text-ink"
              >
                Photo
              </label>
              <input
                id="guardian-photo"
                type="file"
                name="photo"
                accept="image/*"
                className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border file:border-line file:bg-paper file:px-3 file:py-1.5 file:text-sm file:text-ink"
              />
            </div>
            {state.error ? (
              <p role="alert" className="text-sm text-red-700">
                {state.error}
              </p>
            ) : null}
            {state.success ? (
              <p role="status" className="text-sm text-teal">
                {state.success}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save profile"}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}

function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-paper-elevated p-5 sm:p-6">
      <h2 className="text-sm font-semibold tracking-wide text-ink uppercase">
        {title}
      </h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function DlRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line/60 pb-2 last:border-0 last:pb-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue = "",
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
}) {
  const id = `guardian-${name}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
        {required ? <span className="text-red-700"> *</span> : null}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus-visible:border-teal"
      />
    </div>
  );
}
