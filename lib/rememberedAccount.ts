// Opt-in "remember me for 7 days": stores ONLY a non-secret identity hint (the identifier
// signed in with + display name) in localStorage, so a returning user sees a "welcome back"
// greeting and a pre-filled field.
//
// It never stores a token or a password and is never sent to the server: the user still
// authenticates in full every time. Per-device, expires after 7 days, cleared via "Not you?".
//
// `email` holds whatever was signed in with, an address, or a phone as digits. The field
// keeps that name to match the API, which does the same.
//
// Read through `useRememberedAccount()`: localStorage exists only in the browser, so the
// server renders "nobody remembered" and the browser fills it in after hydration, without
// a mismatch and without a setState-in-effect (React's useSyncExternalStore).

import { useMemo, useSyncExternalStore } from "react";

const KEY = "kheengz_remembered_account";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days, which keeps the label honest.

export interface RememberedAccount {
  email: string;
  name: string;
}

interface StoredAccount extends RememberedAccount {
  savedAt: number;
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab signing in or forgetting changes this one too.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** The stored string itself: a primitive, so React can compare snapshots by value. */
function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): RememberedAccount | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredAccount>;
    if (!parsed.email) return null;
    // Expired: "Remember me for 7 days" stays true.
    if (typeof parsed.savedAt === "number" && Date.now() - parsed.savedAt > TTL_MS) return null;
    return { email: parsed.email, name: parsed.name ?? "" };
  } catch {
    return null;
  }
}

/** The account this device remembers, or null (always null on the server). */
export function useRememberedAccount(): RememberedAccount | null {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return useMemo(() => parse(raw), [raw]);
}

export function setRememberedAccount(account: RememberedAccount): void {
  try {
    const stored: StoredAccount = { ...account, savedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(stored));
    notify();
  } catch {
    /* localStorage unavailable (private mode / quota): silently skip */
  }
}

export function clearRememberedAccount(): void {
  try {
    localStorage.removeItem(KEY);
    notify();
  } catch {
    /* no-op */
  }
}
