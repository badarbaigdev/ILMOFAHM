"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  type SchoolStudentActionState,
  updateSchoolStudentAction,
} from "@/features/schools/students/actions";
import type { SchoolStudentRow } from "@/features/schools/students/queries";
import {
  PersonAvatar,
  StatusBadge,
  formatListDate,
} from "@/features/schools/ui/data-table";

const initial: SchoolStudentActionState = { error: null, success: null };

export type StudentGuardianLink = {
  guardianId: string;
  name: string;
  relationship: string;
  isPrimary: boolean;
  photoUrl?: string | null;
};

type Props = {
  schoolId: string;
  student: SchoolStudentRow;
  classLabel: string;
  enrolmentStatus: string | null;
  guardians: StudentGuardianLink[];
  canManage: boolean;
};

export function SchoolStudentProfilePanel({
  schoolId,
  student,
  classLabel,
  enrolmentStatus,
  guardians,
  canManage,
}: Props) {
  const [state, action, pending] = useActionState(
    updateSchoolStudentAction,
    initial,
  );
  const fullName = `${student.firstName} ${student.lastName}`;
  const schoolQuery = `school=${encodeURIComponent(schoolId)}`;
  const idCardHref = `/school/students/${student.id}/id-card?${schoolQuery}`;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line bg-paper-elevated p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          {student.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={student.photoUrl}
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
              <StatusBadge status={student.status} />
            </div>
            <p className="mt-1 text-sm text-muted">
              Admission{" "}
              <span className="font-medium text-teal">{student.studentNumber}</span>
              {classLabel !== "—" ? (
                <>
                  <span className="mx-1.5 text-line">·</span>
                  {classLabel}
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
                href={`/school/students?${schoolQuery}`}
                className="rounded-md px-3 py-1.5 text-sm text-muted no-underline hover:text-ink"
              >
                Back to directory
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileSection title="Personal">
          <DlRow label="First name" value={student.firstName} />
          <DlRow label="Last name" value={student.lastName} />
          <DlRow label="Date of birth" value={formatListDate(student.dateOfBirth)} />
          <DlRow
            label="Gender"
            value={student.gender ? capitalize(student.gender) : "—"}
          />
        </ProfileSection>

        <ProfileSection title="Academic">
          <DlRow label="Admission number" value={student.studentNumber} />
          <DlRow label="Class / section" value={classLabel} />
          <DlRow
            label="Enrolment"
            value={enrolmentStatus ? capitalize(enrolmentStatus) : "Not enrolled"}
          />
          <DlRow label="Status" value={<StatusBadge status={student.status} />} />
        </ProfileSection>
      </div>

      <ProfileSection title="Guardians">
        {guardians.length === 0 ? (
          <p className="text-sm text-muted">No linked guardians.</p>
        ) : (
          <ul className="divide-y divide-line/70">
            {guardians.map((g) => (
              <li key={g.guardianId} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <Link
                  href={`/school/guardians/${g.guardianId}?${schoolQuery}`}
                  className="flex min-w-0 items-center gap-2.5 no-underline hover:opacity-90"
                >
                  {g.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={g.photoUrl}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <PersonAvatar name={g.name} />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-teal">
                      {g.name}
                    </span>
                    <span className="block text-xs text-muted capitalize">
                      {g.relationship}
                      {g.isPrimary ? " · primary" : ""}
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
          aria-labelledby="edit-student-heading"
          className="rounded-2xl border border-line bg-paper-elevated p-5 sm:p-6"
        >
          <h2
            id="edit-student-heading"
            className="text-sm font-semibold tracking-wide text-ink uppercase"
          >
            Edit profile
          </h2>
          <p className="mt-1 text-sm text-muted">
            Update student details and optional photo.
          </p>
          <form action={action} className="mt-6 max-w-xl space-y-4" noValidate>
            <input type="hidden" name="school_id" value={schoolId} />
            <input type="hidden" name="student_id" value={student.id} />
            <input
              type="hidden"
              name="photo_url"
              value={student.photoUrl ?? ""}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Student number"
                name="student_number"
                defaultValue={student.studentNumber}
                required
              />
              <Field
                label="Date of birth"
                name="date_of_birth"
                type="date"
                defaultValue={student.dateOfBirth ?? ""}
              />
              <Field
                label="First name"
                name="first_name"
                defaultValue={student.firstName}
                required
              />
              <Field
                label="Last name"
                name="last_name"
                defaultValue={student.lastName}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="student-gender"
                className="block text-sm font-medium text-ink"
              >
                Gender
              </label>
              <select
                id="student-gender"
                name="gender"
                defaultValue={student.gender ?? ""}
                className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus-visible:border-teal"
              >
                <option value="">Not specified</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
                <option value="unspecified">Unspecified</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="student-photo"
                className="block text-sm font-medium text-ink"
              >
                Photo
              </label>
              <input
                id="student-photo"
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
  const id = `student-${name}`;
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

function capitalize(value: string): string {
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
