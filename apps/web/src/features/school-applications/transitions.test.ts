import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canApproveApplication,
  reviewTargetsFor,
  schoolApplicationTransitionAllowed,
} from "./transitions";

describe("schoolApplicationTransitionAllowed", () => {
  it("allows pending → under_review / rejected / information_requested / approved", () => {
    assert.equal(
      schoolApplicationTransitionAllowed("pending", "under_review"),
      true,
    );
    assert.equal(
      schoolApplicationTransitionAllowed("pending", "rejected"),
      true,
    );
    assert.equal(
      schoolApplicationTransitionAllowed("pending", "information_requested"),
      true,
    );
    assert.equal(
      schoolApplicationTransitionAllowed("pending", "approved"),
      true,
    );
  });

  it("blocks self-transitions and approved → anything", () => {
    assert.equal(
      schoolApplicationTransitionAllowed("pending", "pending"),
      false,
    );
    assert.equal(
      schoolApplicationTransitionAllowed("approved", "under_review"),
      false,
    );
    assert.equal(
      schoolApplicationTransitionAllowed("approved", "rejected"),
      false,
    );
  });

  it("allows rejected → under_review reopen only", () => {
    assert.equal(
      schoolApplicationTransitionAllowed("rejected", "under_review"),
      true,
    );
    assert.equal(
      schoolApplicationTransitionAllowed("rejected", "approved"),
      false,
    );
  });
});

describe("reviewTargetsFor / canApproveApplication", () => {
  it("excludes approved from review targets", () => {
    assert.ok(!reviewTargetsFor("pending").includes("approved"));
    assert.ok(canApproveApplication("pending"));
    assert.ok(canApproveApplication("under_review"));
    assert.equal(canApproveApplication("approved"), false);
    assert.equal(canApproveApplication("rejected"), false);
  });
});
