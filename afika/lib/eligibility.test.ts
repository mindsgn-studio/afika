import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { eligibilityMessage, isEligibleToTrade } from "./eligibility.ts";

describe("eligibility", () => {
  it("rejects missing country", () => {
    assert.equal(isEligibleToTrade({}), false);
    assert.match(eligibilityMessage({}) ?? "", /country/i);
  });

  it("rejects US persons", () => {
    assert.equal(
      isEligibleToTrade({
        country: "US",
        residencyAttestedAt: new Date(),
        termsAcceptedAt: new Date(),
      }),
      false
    );
    assert.match(eligibilityMessage({ country: "US" }) ?? "", /US persons/i);
  });

  it("accepts attested non-US profile", () => {
    assert.equal(
      isEligibleToTrade({
        country: "ZA",
        residencyAttestedAt: { seconds: 1 },
        termsAcceptedAt: { seconds: 1 },
      }),
      true
    );
  });
});
