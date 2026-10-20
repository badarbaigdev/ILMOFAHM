# Module Implementation Checklist Template

Use this for every new module. Copy into the GitHub Epic/issue or module folder and adapt it to the actual requirements.

## Module name and outcome

Describe the user outcome, supported roles, scope, and explicit exclusions.

## Dependencies

List prerequisite schemas/modules, feature flags, providers, and migration dependencies.

## Subtasks

- [ ] Requirements and business rules (including edge cases)
- [ ] Data model, SQL migration, constraints, indexes and seed/test fixtures
- [ ] Tenant RLS policies and least-privilege grants
- [ ] Server-side use-cases/queries and input validation
- [ ] Authorization matrix: role, organization, campus, class/guardian scope
- [ ] UI pages/components and loading/empty/error/unauthorized states
- [ ] Unit and integration tests
- [ ] RLS allow/deny and cross-tenant tests
- [ ] Browser end-to-end tests for critical journeys
- [ ] Logging/audit/idempotency for high-impact actions
- [ ] Accessibility, responsive/mobile, and Urdu/RTL checks where relevant
- [ ] Documentation and API/schema notes
- [ ] Deployment, migration and rollback notes
- [ ] UAT acceptance and sign-off

## Acceptance criteria

Write measurable conditions. Every “must” should map to at least one test or explicit manual acceptance step.

## Release checklist

- [ ] Migration tested from a clean database
- [ ] CI passes
- [ ] Security reviewer accepts tenant/permission design
- [ ] Staging acceptance passes
- [ ] Rollback/recovery plan is documented for risky changes
