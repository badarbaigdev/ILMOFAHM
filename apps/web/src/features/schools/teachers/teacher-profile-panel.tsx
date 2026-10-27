"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  type SchoolTeacherActionState,
  updateSchoolTeacherAction,
} from "@/features/schools/teachers/actions";
import type { SchoolTeacherRow } from "@/features/schools/teachers/queries";
import { StatusBadge } from "@/features/schools/ui/data-table";

const initial: SchoolTeacherActionState = { error: null, success: null };

type Props = {
  schoolId: string;
  teacher: SchoolTeacherRow;
  canManage: boolean;
};

export function SchoolTeacherProfilePanel({
  schoolId,
  teacher,
  canManage,
}: Props) {
  const [state, action, pending] = useActionState(
    updateSchoolTeacherAction,
    initial,
  );
  const fullName = `${teacher.firstName} ${teacher.lastName}`;
  const schoolQuery = `school=${encodeURIComponent(schoolId)}`;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line bg-paper-elevated p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          {teacher.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={teacher.photoUrl}
              alt=""
              className="h-20 w-20 rounded-2xl object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#dce8e6] text-xl font-semibold text-teal"
            >
              {fullName
                .split(/\s+/)
                .filter(Boolean)
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "?"}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-ink">
                {fullName}
              </h1>
              <StatusBadge status={teacher.status} />
            </div>
            <p className="mt-1 text-sm text-muted">
              Staff{" "}
              <span className="font-medium text-teal">{teacher.staffNumber}</span>
              {teacher.primarySubject ? (
                <>
                  <span className="mx-1.5 text-line">·</span>
                  {teacher.primarySubject}
                </>
              ) : null}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/school/teachers?${schoolQuery}`}
                className="rounded-md px-3 py-1.5 text-sm text-muted no-underline hover:text-ink"
              >
                Back to teachers
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileSection title="Personal">
          <DlRow label="First name" value={teacher.firstName} />
          <DlRow label="Last name" value={teacher.lastName} />
          <DlRow label="Staff number" value={teacher.staffNumber} />
          <DlRow label="Status" value={<StatusBadge status={teacher.status} />} />
        </ProfileSection>

        <ProfileSection title="Contact & subject">
          <DlRow label="Email" value={teacher.email ?? "—"} />
          <DlRow label="Phone" value={teacher.phone ?? "—"} />
          <DlRow label="Primary subject" value={teacher.primarySubject ?? "—"} />
        </ProfileSection>
      </div>

      {canManage ? (
        <section
          aria-labelledby="edit-teacher-heading"
          className="rounded-2xl border border-line bg-paper-elevated p-5 sm:p-6"
        >
          <h2
            id="edit-teacher-heading"
            className="text-sm font-semibold tracking-wide text-ink uppercase"
          >
            Edit profile
          </h2>
          <p className="mt-1 text-sm text-muted">
            Update teacher details and optional photo.
          </p>
          <form action={action} className="mt-6 max-w-xl space-y-4" noValidate>
            <input type="hidden" name="school_id" value={schoolId} />
            <input type="hidden" name="teacher_id" value={teacher.id} />
            <input
              type="hidden"
              name="photo_url"
              value={teacher.photoUrl ?? ""}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Staff number"
                name="staff_number"
                defaultValue={teacher.staffNumber}
                required
              />
              <Field
                label="Primary subject"
                name="primary_subject"
                defaultValue={teacher.primarySubject ?? ""}
              />
              <Field
                label="First name"
                name="first_name"
                defaultValue={teacher.firstName}
                required
              />
              <Field
                label="Last name"
                name="last_name"
                defaultValue={teacher.lastName}
                required
              />
              <Field
                label="Email"
                name="email"
                type="email"
                defaultValue={teacher.email ?? ""}
              />
              <Field
                label="Phone"
                name="phone"
                defaultValue={teacher.phone ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="teacher-photo"
                className="block text-sm font-medium text-ink"
              >
                Photo
              </label>
              <input
                id="teacher-photo"
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
  const id = `teacher-${name}`;
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
