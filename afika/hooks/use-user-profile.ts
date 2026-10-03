import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "@react-native-firebase/firestore";
import { getFirestore } from "@/lib/firestore";
import type { EligibilityProfile } from "@/lib/eligibility";

export function useUserProfile(uid?: string | null) {
  const [profile, setProfile] = useState<EligibilityProfile | null>(null);
  const [loading, setLoading] = useState(Boolean(uid));

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const db = getFirestore();
    const unsubscribe = onSnapshot(
      doc(db, "users", uid),
        (doc) => {
          setProfile((doc.data() as EligibilityProfile) || null);
          setLoading(false);
        },
        () => setLoading(false)
      );
    return unsubscribe;
  }, [uid]);

  const saveEligibility = async (country: string) => {
    if (!uid) throw new Error("Not signed in");
    const db = getFirestore();
    await updateDoc(doc(db, "users", uid), {
      country: country.toUpperCase(),
      residencyAttestedAt: serverTimestamp(),
      termsAcceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  return { profile, loading, saveEligibility };
}
