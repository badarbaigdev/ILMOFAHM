"use client";

import { useActionState, useEffect, useState } from "react";

import { buildSchoolInviteAcceptUrl } from "@/features/auth/paths";
import {
  reissueSchoolOwnerInvitationAction,
  type ReissueOwnerInviteState,
} from "@/features/schools/invitations/reissue-actions";
import { getPublicEnv } from "@/lib/env";

function activationUrl(token: string): string {
  try {
    return buildSchoolInviteAcceptUrl(getPublicEnv().appUrl, token);
  } catch {
    return `/auth/accept-school-invite?token=${encodeURIComponent(token)}`;
  }
}

function CopyableLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-ink" htmlFor="activation-link">
        School admin activation link
      </label>
      <textarea
        id="activation-link"
        readOnly
        rows={3}
        value={url}
        className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 font-mono text-xs text-ink outline-none focus-visible:border-teal"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copy()}
          className="rounded-md bg-teal px-3 py-2 text-sm font-medium text-white"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink no-underline"
        >
          Open link
        </a>
      </div>
    </div>
  );
}

/**
 * Shown right after approve/provision when a fresh token is available.
 */
export function FreshActivationLinkPanel({
  token,
  applicantEmail,
  schoolName,
}: {
  token: string;
  applicantEmail: string;
  schoolName: string;
}) {
  const url = activationUrl(token);
  const mailto = `mailto:${encodeURIComponent(applicantEmail)}?subject=${encodeURIComponent(
    `Activate ${schoolName} on ILMOFAHM`,
  )}&body=${encodeURIComponent(
    `Your school registration for ${schoolName} was approved.\n\nOpen this link and choose “Open school dashboard” (signed in as ${applicantEmail}). You can set a password after you enter:\n\n${url}\n\nThis link is personal to ${applicantEmail}.`,
  )}`;

  return (
    <section
      aria-labelledby="share-activation-heading"
      className="mt-6 space-y-4 rounded-md border border-teal/30 bg-teal/5 p-4"
    >
      <h2
        id="share-activation-heading"
        className="text-sm font-semibold tracking-wide text-ink uppercase"
      >
        Share with school admin
      </h2>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-ink">
        <li>Copy the activation link below (or open mail draft).</li>
        <li>
          Send it to <span className="font-medium">{applicantEmail}</span>{" "}
          (locked — they cannot change the email).
        </li>
        <li>
          They open the link and click <span className="font-medium">Open
          school dashboard</span> — no signup form. They can set a password
          after entering.
        </li>
      </ol>
      <CopyableLink url={url} />
      <p>
        <a
          href={mailto}
          className="text-sm font-medium text-ink underline-offset-2 hover:underline"
        >
          Open email draft to {applicantEmail}
        </a>
      </p>
      <p className="text-xs text-muted">
        Email sending is not automated yet. The link is shown now; if you leave
        this page, use “Generate activation link” below to mint a new one.
        Use a real applicant email on registration (not example.com / .test).
      </p>
    </section>
  );
}

const reissueInitial: ReissueOwnerInviteState = {
  error: null,
  success: null,
  invitationToken: null,
  email: null,
};

/**
 * Lets operators mint/share an activation link after the one-time token is gone.
 */
export function ReissueActivationLinkPanel({
  schoolId,
  schoolName,
  applicantEmail,
  invitationStatus,
}: {
  schoolId: string;
  schoolName: string;
  applicantEmail: string;
  invitationStatus: string | null;
}) {
  const [state, action, pending] = useActionState(
    reissueSchoolOwnerInvitationAction,
    reissueInitial,
  );
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (state.invitationToken) {
      setToken(state.invitationToken);
    }
  }, [state.invitationToken]);

  if (invitationStatus === "accepted") {
    return (
      <section className="mt-8 rounded-md border border-line/70 p-4">
        <h2 className="text-sm font-semibold tracking-wide text-ink uppercase">
          School admin access
        </h2>
        <p className="mt-2 text-sm text-muted">
          The school admin has already accepted their invitation. They can sign
          in at{" "}
          <a href="/auth/sign-in" className="text-ink underline-offset-2 hover:underline">
            /auth/sign-in
          </a>{" "}
          and open{" "}
          <a href="/school" className="text-ink underline-offset-2 hover:underline">
            /school
          </a>
          .
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="reissue-activation-heading"
      className="mt-8 space-y-4 rounded-md border border-line/70 p-4"
    >
      <h2
        id="reissue-activation-heading"
        className="text-sm font-semibold tracking-wide text-ink uppercase"
      >
        School admin activation link
      </h2>
      <p className="text-sm text-muted">
        Share a one-time link with{" "}
        <span className="font-medium text-ink">{applicantEmail}</span> so they
        can enter <span className="font-medium text-ink">{schoolName}</span>.
        Generating a new link revokes any previous unused owner link.
      </p>

      {token ? (
        <FreshActivationLinkPanel
          token={token}
          applicantEmail={state.email ?? applicantEmail}
          schoolName={schoolName}
        />
      ) : null}

      <form action={action} className="space-y-3">
        <input type="hidden" name="school_id" value={schoolId} />
        {state.error ? (
          <p role="alert" className="text-sm text-red-700">
            {state.error}
          </p>
        ) : null}
        {state.success && !token ? (
          <p role="status" className="text-sm text-teal">
            {state.success}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper-elevated disabled:opacity-60"
        >
          {pending
            ? "Generating…"
            : token
              ? "Generate a new link"
              : "Generate activation link"}
        </button>
      </form>
    </section>
  );
}
