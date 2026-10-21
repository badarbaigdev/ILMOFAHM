import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveWorkspaceContext } from "./resolve";

const ORG_A = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "School A",
  role: "owner",
};
const ORG_B = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Academy B",
  role: "admin",
};
const CAMPUS_A1 = {
  id: "33333333-3333-4333-8333-333333333333",
  organizationId: ORG_A.id,
  name: "Campus A1",
  status: "active",
};
const CAMPUS_A2 = {
  id: "44444444-4444-4444-8444-444444444444",
  organizationId: ORG_A.id,
  name: "Campus A2",
  status: "active",
};
const CAMPUS_B1 = {
  id: "55555555-5555-4555-8555-555555555555",
  organizationId: ORG_B.id,
  name: "Campus B1",
  status: "active",
};
const FOREIGN = {
  id: "99999999-9999-4999-8999-999999999999",
  organizationId: "88888888-8888-4888-8888-888888888888",
  name: "Foreign",
  status: "active",
};

describe("resolveWorkspaceContext", () => {
  it("defaults to the first membership organization and campus", () => {
    const ctx = resolveWorkspaceContext({
      organizations: [ORG_A, ORG_B],
      campuses: [CAMPUS_A1, CAMPUS_B1],
    });
    assert.equal(ctx?.organization.id, ORG_A.id);
    assert.equal(ctx?.campus?.id, CAMPUS_A1.id);
    assert.equal(ctx?.ignoredInvalidSelection, false);
  });

  it("selects a requested organization the user belongs to", () => {
    const ctx = resolveWorkspaceContext({
      organizations: [ORG_A, ORG_B],
      campuses: [CAMPUS_A1, CAMPUS_B1],
      requestedOrganizationId: ORG_B.id,
    });
    assert.equal(ctx?.organization.id, ORG_B.id);
    assert.equal(ctx?.campus?.id, CAMPUS_B1.id);
  });

  it("ignores unknown organization ids without revealing them", () => {
    const ctx = resolveWorkspaceContext({
      organizations: [ORG_A],
      campuses: [CAMPUS_A1],
      requestedOrganizationId: FOREIGN.organizationId,
    });
    assert.equal(ctx?.organization.id, ORG_A.id);
    assert.equal(ctx?.ignoredInvalidSelection, true);
  });

  it("ignores campus ids from another organization", () => {
    const ctx = resolveWorkspaceContext({
      organizations: [ORG_A, ORG_B],
      campuses: [CAMPUS_A1, CAMPUS_A2, CAMPUS_B1],
      requestedOrganizationId: ORG_A.id,
      requestedCampusId: CAMPUS_B1.id,
    });
    assert.equal(ctx?.organization.id, ORG_A.id);
    assert.equal(ctx?.campus?.id, CAMPUS_A1.id);
    assert.equal(ctx?.ignoredInvalidSelection, true);
  });

  it("selects a campus within the active organization", () => {
    const ctx = resolveWorkspaceContext({
      organizations: [ORG_A],
      campuses: [CAMPUS_A1, CAMPUS_A2],
      requestedCampusId: CAMPUS_A2.id,
    });
    assert.equal(ctx?.campus?.id, CAMPUS_A2.id);
  });

  it("returns null when the user has no organizations", () => {
    assert.equal(
      resolveWorkspaceContext({ organizations: [], campuses: [] }),
      null,
    );
  });

  it("exposes selected-org campuses and keeps all visible campuses separate", () => {
    const ctx = resolveWorkspaceContext({
      organizations: [ORG_A, ORG_B],
      campuses: [CAMPUS_A1, CAMPUS_B1, FOREIGN],
      requestedOrganizationId: ORG_A.id,
    });
    assert.deepEqual(
      ctx?.campuses.map((c) => c.id),
      [CAMPUS_A1.id],
    );
    assert.deepEqual(
      ctx?.allCampuses.map((c) => c.id).sort(),
      [CAMPUS_A1.id, CAMPUS_B1.id, FOREIGN.id].sort(),
    );
  });
});
