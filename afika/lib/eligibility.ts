export type EligibilityProfile = {
  country?: string | null;
  residencyAttestedAt?: unknown;
  termsAcceptedAt?: unknown;
};

export function isEligibleToTrade(profile?: EligibilityProfile | null) {
  const country = (profile?.country ?? "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(country) || country === "US") {
    return false;
  }
  return Boolean(profile?.residencyAttestedAt && profile?.termsAcceptedAt);
}

export function eligibilityMessage(profile?: EligibilityProfile | null) {
  const country = (profile?.country ?? "").toUpperCase();
  if (country === "US") {
    return "Coinbase tokenized stocks are not available to US persons.";
  }
  if (!country) {
    return "Confirm your country of residence before trading.";
  }
  if (!profile?.residencyAttestedAt || !profile?.termsAcceptedAt) {
    return "Accept the terms and confirm you are not a US person.";
  }
  return null;
}
