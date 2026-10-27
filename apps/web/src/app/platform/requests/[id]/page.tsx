import Link from "next/link";
import { notFound } from "next/navigation";

import { SchoolApplicationReviewForms } from "@/features/school-applications/review-forms";
import { getSchoolApplication } from "@/features/school-applications/queries";
import { schoolApplicationStatusLabel } from "@/features/school-applications/transitions";
import { requirePlatformOperatorPage } from "@/features/platform/operator/require-operator";
import {
  institutionTypeLabel,
  isInstitutionType,
} from "@/features/institution/mode";
import { getSchoolProvisioningSnapshot } from "@/features/schools/platform-queries";

type Params = Promise<{ id: string }>;

export default async function PlatformRequestDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const { supabase } = await requirePlatformOperatorPage(
    "platform.applications.manage",
  );

  let application;
  try {
    application = await getSchoolApplication(supabase, id);
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
      >
        <h1 className="font-display text-4xl tracking-tight text-ink">
          Application
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load this application.
        </p>
        <p className="mt-6">
          <Link href="/platform/requests" className="text-sm text-ink underline">
            Back to requests
          </Link>
        </p>
      </main>
    );
  }

  if (!application) {
    notFound();
  }

  const provisioning = application.provisionedSchoolId
    ? await getSchoolProvisioningSnapshot(
        supabase,
        application.provisionedSchoolId,
      ).catch(() => null)
    : null;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
    >
      <p className="text-sm">
        <Link
          href="/platform/requests"
          className="text-muted no-underline hover:text-ink hover:underline"
        >
          ← School requests
        </Link>
      </p>
      <p className="mt-6 text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
        Application review
      </p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-4xl tracking-tight text-ink">
          {application.schoolName}
        </h1>
        <span className="text-xs tracking-wide text-muted uppercase">
          {schoolApplicationStatusLabel(application.status)}
        </span>
      </div>

      <dl className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs tracking-wide text-muted uppercase">
            Applicant
          </dt>
          <dd className="mt-1 text-ink">
            {application.applicantName}
            <br />
            <span className="text-muted">{application.applicantEmail}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs tracking-wide text-muted uppercase">
            Institution
          </dt>
          <dd className="mt-1 text-ink">
            {isInstitutionType(application.institutionType)
              ? institutionTypeLabel(application.institutionType)
              : application.institutionType}
            {application.city ? ` · ${application.city}` : ""}
            {application.region ? `, ${application.region}` : ""}
            {` · ${application.countryCode}`}
          </dd>
        </div>
        {application.phone ? (
          <div>
            <dt className="text-xs tracking-wide text-muted uppercase">Phone</dt>
            <dd className="mt-1 text-ink">{application.phone}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs tracking-wide text-muted uppercase">
            Submitted
          </dt>
          <dd className="mt-1 text-ink">
            {new Date(application.createdAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </dd>
        </div>
        {application.message ? (
          <div className="sm:col-span-2">
            <dt className="text-xs tracking-wide text-muted uppercase">
              Message
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-ink">
              {application.message}
            </dd>
          </div>
        ) : null}
        {application.rejectionReason ? (
          <div className="sm:col-span-2">
            <dt className="text-xs tracking-wide text-muted uppercase">
              Rejection reason
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-ink">
              {application.rejectionReason}
            </dd>
          </div>
        ) : null}
        {application.informationRequest ? (
          <div className="sm:col-span-2">
            <dt className="text-xs tracking-wide text-muted uppercase">
              Information request
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-ink">
              {application.informationRequest}
            </dd>
          </div>
        ) : null}
        {application.reviewNotes ? (
          <div className="sm:col-span-2">
            <dt className="text-xs tracking-wide text-muted uppercase">
              Review notes
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-ink">
              {application.reviewNotes}
            </dd>
          </div>
        ) : null}
        {application.provisionedSchoolId ? (
          <div className="sm:col-span-2">
            <dt className="text-xs tracking-wide text-muted uppercase">
              School created
            </dt>
            <dd className="mt-1 space-y-1 text-ink">
              {provisioning ? (
                <>
                  <p>
                    {provisioning.schoolName}
                    {provisioning.schoolSlug
                      ? ` · ${provisioning.schoolSlug}`
                      : ""}{" "}
                    · {provisioning.schoolStatus.replaceAll("_", " ")}
                  </p>
                  <p className="text-sm text-muted">
                    Campus: {provisioning.campusName ?? "missing"}
                    {" · "}
                    School admin invite:{" "}
                    {provisioning.invitationStatus === "accepted"
                      ? "accepted — they can sign in at /school"
                      : provisioning.invitationStatus === "pending"
                        ? "pending — share the activation link below"
                        : (provisioning.invitationStatus ?? "missing")}
                  </p>
                </>
              ) : null}
              <p>
                <Link
                  href="/platform/schools"
                  className="text-sm text-ink underline-offset-2 hover:underline"
                >
                  Open schools list
                </Link>
              </p>
            </dd>
          </div>
        ) : null}
      </dl>

      <SchoolApplicationReviewForms
        applicationId={application.id}
        status={application.status}
        currentReviewNotes={application.reviewNotes}
        provisionedSchoolId={application.provisionedSchoolId}
        provisioningComplete={provisioning?.complete ?? null}
        applicantEmail={application.applicantEmail}
        schoolName={application.schoolName}
        invitationStatus={provisioning?.invitationStatus ?? null}
      />
    </main>
  );
}
