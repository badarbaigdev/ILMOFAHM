# Security Baseline — Required Before Pilot

This is an engineering baseline, not a legal compliance certification. Have qualified local counsel review contracts, child-data handling, retention, data location/cross-border processing, and applicable education and privacy obligations before commercial launch.

## Tenant data model

- `organizations` are the tenant boundary.
- `campuses` belong to an organization.
- `profiles` are global user profile records; school access comes from memberships, not a profile role.
- `organization_memberships` link auth users to organizations and hold a status and organization-level role.
- Campus-scoped assignments/permissions are modelled explicitly when needed.
- Student/guardian relationship records control a parent's linked children; never trust a student ID supplied by a parent-facing screen.
- Each tenant-owned business table has a non-null `organization_id` and, when relevant, `campus_id`, with foreign keys/constraints that prevent accidental mismatched ownership.

## Authorization model

Use role-based access plus contextual scope. Roles are permissions bundles, not proof that a user owns a record. Check:

1. authenticated user;
2. active membership in the requested organization;
3. role permission for the action;
4. campus/class/relationship scope for the resource;
5. record status or workflow conditions (e.g. published result, approved refund).

Enforce checks in server-side use-cases and with database RLS where the table is exposed. UI route guards only improve UX; they are not the security boundary.

## RLS and SQL grants

For each exposed table:

- Enable RLS.
- Revoke default/broad privileges that aren't required and explicitly grant only the needed operations to the intended roles.
- Write separate `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies as needed; don't use `FOR ALL` as a substitute for understanding each operation.
- For writes, validate the resulting row using `WITH CHECK` or equivalent constraints so tenant/campus IDs cannot be reassigned by a user.
- Review views and functions. Use safe invoker semantics for views when appropriate; carefully review `SECURITY DEFINER` functions and their search paths/privileges.
- Add indexes for policy membership lookups and foreign keys; benchmark high-volume queries.
- Include tests proving both allowed and denied access for anonymous, same-tenant and cross-tenant users.

Never base authorization on user-editable profile metadata or client-supplied `organization_id`. Authorization data must come from trusted, server-validated membership records. Keep privileged Supabase keys server-only and use them only in narrow administrative flows.

## Sensitive data and files

- Classify student personal details, guardian information, medical/emergency data, safeguarding notes, salary/payroll information, fee concessions and financial transactions.
- Collect only information needed for a defined purpose.
- Restrict medical/wellbeing notes and payroll fields to specific permission scopes; don't include them in default search, broad exports or logs.
- Keep buckets private by default. Use object policies or short-lived signed URLs after server-side authorization.
- Validate file size, extension and actual content type; randomize stored filenames; prevent executable content from being served as trusted HTML; scan risky uploads before production use.
- Do not put child details, fee balances or sensitive results into email/SMS/WhatsApp payloads unless the approved channel and policy explicitly allow it.

## Audit and financial integrity

Record actor, organization, action, target type/ID, timestamp, outcome, and safe metadata for privileged actions, role changes, exports, attendance corrections, grade changes, financial payment/refund/adjustment actions, and support access. Do not log access tokens or unnecessary personal data.

Use immutable ledger-style entries or explicit reversals for posted financial transactions. A correction creates history; it does not erase what previously happened. Result publication/corrections should similarly preserve version and approver details.

## Security tests required for every applicable module

- Change an ID in a URL/body to another tenant's ID; request must be denied.
- Attempt to assign a row to a different `organization_id`/`campus_id`; database policy/constraint must reject it.
- Try direct API and Storage access, not only frontend navigation.
- Test revoked/suspended membership and expired sessions.
- Test guardian linked to one child cannot retrieve a sibling/unrelated child unless separately linked.
- Test teacher cannot submit attendance or marks for an unassigned class.
- Test CSV/export endpoints apply the same authorization as UI tables.
- Test duplicate retries do not create duplicate billing runs, payment receipts, or attendance submissions.

## Operational controls

Use separate development/staging/production projects; least-privilege secrets; dependency updates; rate limits on authentication and public forms; CSP/security headers appropriate to app integrations; request validation; safe errors; backups and restore drills; incident severity/escalation process; access review; and a documented response path for exposed credentials.
