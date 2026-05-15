// Local-first user profile stored in localStorage.
// Used to personalize the app even when offline.

import { useEffect, useState } from "react";

export type LocalProfile = {
  firstName: string;
  displayName: string;
  age: string; // kept as string for input flexibility
  weight: string; // kg
  height: string; // cm
};

const STORAGE_KEY = "ironlog.profile.v1";

const EMPTY: LocalProfile = {
  firstName: "",
  displayName: "",
  age: "",
  weight: "",
  height: "",
};

export function readProfile(): LocalProfile {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<LocalProfile>) };
  } catch {
    return EMPTY;
  }
}

export function writeProfile(p: LocalProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  window.dispatchEvent(new CustomEvent("ironlog:profile-changed"));
}

/** Reactive hook — re-renders when profile is saved anywhere in the app. */
export function useProfile(): LocalProfile {
  const [p, setP] = useState<LocalProfile>(() => readProfile());
  useEffect(() => {
    const handler = () => setP(readProfile());
    window.addEventListener("ironlog:profile-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("ironlog:profile-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return p;
}

/** Resolve the best display name to greet the user with. */
export function resolveDisplayName(
  profile: LocalProfile,
  fallback?: { fullName?: string | null; email?: string | null },
): string {
  const dn = profile.displayName.trim();
  if (dn) return dn;
  const fn = profile.firstName.trim();
  if (fn) return fn;
  const fullName = fallback?.fullName?.trim();
  if (fullName) return fullName.split(/\s+/)[0];
  return "Athlete";
}
