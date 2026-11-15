"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { nextPhoneValue } from "@/lib/phone";

/**
 * One box for "email, phone number or username".
 *
 * The field decides what it is from what you type: start with a digit or "+" and it becomes
 * a phone input with the country picker; type anything else and it stays a plain email box.
 * Nothing to tick, and nobody has to type "256" first.
 *
 * The value it reports is what the API stores: an address as typed, or a phone as digits only
 * with its country code and no "+", e.g. 256700000000. Mirrors lib/phone.ts and
 * UserController::normalizePhone() on the backend.
 */

const DEFAULT_COUNTRY = "ug";
const DEFAULT_DIAL = "256";

/** Whether what has been typed so far is heading towards a phone number. */
export function looksLikePhone(value: string): boolean {
  return /^[+\d]/.test(value.trim());
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Submit on Enter, for forms not wrapped in a <form>. */
  onEnter?: () => void;
  invalid?: boolean;
  disabled?: boolean;
  placeholder?: string;
  autoComplete?: string;
  className?: string;
  /** DOM name: lets the parent read the live field value at submit (autofill safety). */
  name?: string;
};

export default function CredentialInput({
  value,
  onChange,
  onBlur,
  onEnter,
  invalid = false,
  disabled = false,
  placeholder = "Enter your email, phone number or username",
  autoComplete = "username",
  className = "",
  name,
}: Props) {
  // Which box is showing is state, not a function of the value: derived, any
  // moment the value goes empty yanks the phone box away mid-typing.
  const [mode, setMode] = useState<"email" | "phone">(() =>
    looksLikePhone(value) ? "phone" : "email"
  );
  const wrapRef = useRef<HTMLDivElement>(null);
  const swappedRef = useRef(false);
  // The selected country's dial code. Only onChange is told which country is selected, but
  // the keydown handler needs it to tell "just the dial code" from "a number".
  const dialRef = useRef(DEFAULT_DIAL);

  // Follow the value when it is set from outside (a remembered account filling the form), but
  // never while the user is working in it, that is their business.
  //
  // The swap guard matters: swapping boxes momentarily blurs the field, and a swap can
  // legitimately leave the value empty (typing "+" alone). Without it this would read that as
  // "not a phone" and snatch the box straight back.
  useEffect(() => {
    if (swappedRef.current) return;

    const focused = wrapRef.current?.contains(document.activeElement);
    if (!focused) {
      setMode(looksLikePhone(value) ? "phone" : "email");
    }
  }, [value]);

  // Swapping the boxes unmounts one and mounts the other, which drops focus mid-keystroke.
  // Put it back on the new box, caret at the end.
  useEffect(() => {
    if (!swappedRef.current) return;
    swappedRef.current = false;

    const input = wrapRef.current?.querySelector("input");
    if (input) {
      input.focus();
      const end = input.value.length;
      input.setSelectionRange(end, end);
    }
  }, [mode]);

  /** Typing in the email box, a leading digit or "+" turns it into a phone. */
  const handleText = (raw: string) => {
    if (!looksLikePhone(raw)) {
      onChange(raw);
      return;
    }

    swappedRef.current = true;
    setMode("phone");

    const digits = raw.replace(/\D/g, "");

    // A leading "+" means they are dialling a country code themselves, so take the digits
    // as-is. Otherwise what they typed is a local number: 0700… starts a Ugandan number,
    // not country code 7.
    if (raw.trimStart().startsWith("+")) {
      onChange(digits);
      return;
    }

    onChange(DEFAULT_DIAL + digits.replace(/^0+/, ""));
  };

  /**
   * Typing in the phone box, or picking a country.
   *
   * This never hands the box back on its own. Picking a country emits that country's dial
   * code with no national part yet: indistinguishable from an empty field, so reverting
   * here wiped the number the moment you touched the flag. Going back to the email box is
   * Backspace's job, where the intent is explicit.
   */
  const handlePhone = (phone: string, meta?: { country?: { dialCode?: string } }) => {
    const dial = meta?.country?.dialCode ?? "";
    const previousDial = dialRef.current;

    if (dial) {
      dialRef.current = dial;
    }

    // The dial code stays IN the value rather than being blanked when no number has been
    // typed yet: this control is value-driven, so blanking it would snap the country back to
    // the default and undo the pick.
    onChange(nextPhoneValue({ phone, dial, previousValue: value, previousDial }));
  };

  /**
   * Backspace with nothing but the dial code left hands the box back, so a mistyped digit is
   * not a dead end, the dial code itself cannot be deleted, so there would otherwise be no
   * way back to typing an address.
   */
  const handlePhoneKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      onEnter?.();
      return;
    }

    if (event.key !== "Backspace") return;

    if (event.currentTarget.value.replace(/\D/g, "") === dialRef.current) {
      event.preventDefault();
      swappedRef.current = true;
      setMode("email");
      onChange("");
    }
  };

  const base = [
    "w-full rounded-lg border py-2.5 text-sm outline-none transition-all",
    "bg-(--cream-deep) text-(--ink) placeholder:text-(--ink)/55",
    invalid
      ? "border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-400/20"
      : "border-(--brand)/20 focus:border-(--brand) focus:ring-2 focus:ring-(--brand-ring)",
  ].join(" ");

  return (
    <div className="relative" ref={wrapRef}>
      {mode === "phone" ? (
        <PhoneInput
          defaultCountry={DEFAULT_COUNTRY}
          // Pinned to the top of the list: almost every user here is Ugandan, and the library
          // only scrolls to the selected country when its focused index CHANGES, on first
          // open the index is already set, so the list would otherwise open mid-alphabet.
          preferredCountries={[DEFAULT_COUNTRY]}
          value={value ? `+${value}` : ""}
          onChange={handlePhone}
          onBlur={onBlur}
          disabled={disabled}
          inputProps={{ autoComplete, onKeyDown: handlePhoneKeyDown, name }}
          className={`gip-phone gip-phone--auth ${invalid ? "p-invalid" : ""} ${className}`}
        />
      ) : (
        <input
          name={name}
          value={value}
          onChange={(e) => handleText(e.target.value)}
          onBlur={onBlur}
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
          type="text"
          inputMode="email"
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className={`${base} px-4 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        />
      )}
    </div>
  );
}
