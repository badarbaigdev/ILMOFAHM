import { SchoolMembersPanel } from "@/features/schools/members/members-panel";
import { SchoolAdminPreviewShell } from "@/features/schools/ui-preview/admin-shell";
import {
  PREVIEW_OWNER_USER_ID,
  previewInvitations,
  previewMembers,
  previewSchool,
} from "@/features/schools/ui-preview/fixtures";
import { assertUiPreviewAllowed } from "@/features/schools/ui-preview/guard";

export const metadata = {
  title: "School members · UI preview",
};

export default function SchoolMembersUiPreviewPage() {
  assertUiPreviewAllowed();
  return (
    <SchoolAdminPreviewShell
      pathname="/ui-preview/school/members"
      title={`Staff & roles · ${previewSchool.name}`}
      breadcrumbs={["Dashboard", "Staff & roles"]}
    >
      <p className="mb-6 text-sm text-muted">
        Invite staff, change roles, and suspend or revoke access. Preview only —
        actions are not live.
      </p>
      <SchoolMembersPanel
        schoolId={previewSchool.id}
        schoolName={previewSchool.name}
        canInvite
        canManageStatus
        canManageRole
        currentUserId={PREVIEW_OWNER_USER_ID}
        members={previewMembers}
        invitations={previewInvitations}
      />
    </SchoolAdminPreviewShell>
  );
}
