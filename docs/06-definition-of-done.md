# Definition of Done

A task is complete only when every applicable item is satisfied:

- [ ] Approved issue and acceptance criteria implemented; scope changes are recorded.
- [ ] Code follows the feature/domain structure and keeps business logic out of UI components.
- [ ] Server-side authentication, membership, role, and object/campus scope checks are implemented.
- [ ] Database changes are via migration; constraints and indexes are reviewed.
- [ ] RLS and least-privilege grants are present for exposed tenant-owned tables.
- [ ] Tests cover success, validation, permission denial, cross-tenant denial, and relevant edge/idempotency cases.
- [ ] Loading, empty, error, success, and unauthorized UI states are handled where applicable.
- [ ] Responsive behavior, keyboard access, focus states, labels, and contrast are checked for relevant screens.
- [ ] Logging and audit history are included for sensitive/high-impact behavior, without leaking secrets or sensitive data.
- [ ] Docs and operator instructions are updated.
- [ ] Lint, typecheck, tests, migration checks, and production build pass in CI.
- [ ] A reviewer has checked security impact and deployment/rollback risk.
- [ ] Feature is deployed to the right environment and accepted by the designated reviewer/representative user when UAT applies.
