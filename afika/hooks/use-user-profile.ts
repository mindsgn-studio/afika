import { useCallback, useEffect, useState } from "react";
import { readLocal, writeLocal } from "@/lib/local-store";
import type { EligibilityProfile } from "@/lib/eligibility";

function profileKey(accountId: string) {
  return `eligibility.${accountId.trim().toLowerCase()}`;
}

/**
 * Trading eligibility is stored on the device now that `users/{uid}` is gone.
 * The attestation is only as trustworthy as the device until the API exposes a
 * server-side eligibility record.
 */
export function useUserProfile(accountId?: string | null) {
  const [profile, setProfile] = useState<EligibilityProfile | null>(null);
  const [loading, setLoading] = useState(Boolean(accountId));

  useEffect(() => {
    let active = true;

    if (!accountId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    readLocal<EligibilityProfile | null>(profileKey(accountId), null)
      .then((stored) => {
        if (active) setProfile(stored ?? null);
      })
      .catch((error) => {
        console.log("useUserProfile error:", error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [accountId]);

  const saveEligibility = useCallback(
    async (country: string) => {
      if (!accountId) throw new Error("Wallet not ready");

      const now = Date.now();
      const next: EligibilityProfile = {
        country: country.trim().toUpperCase(),
        residencyAttestedAt: now,
        termsAcceptedAt: now,
        updatedAt: now,
      };

      await writeLocal(profileKey(accountId), next);
      setProfile(next);
    },
    [accountId],
  );

  return { profile, loading, saveEligibility };
}
