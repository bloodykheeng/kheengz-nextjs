// Shared phone-number handling for every form that takes one (users today,
// vendors, riders and checkout later). Numbers are stored as strings but
// must be real, dialable numbers WITH a country code, digits only (no "+", no
// spaces). User formatting is accepted on input and normalized before
// validating; the backend normalizes again before storing, so what lands in the
// database is always digits only.

export const PHONE_PLACEHOLDER = "256700000000";
export const PHONE_HINT =
  "Enter a valid phone number including country code, digits only, e.g. 256700000000";

// Digits only: 10 to 15 digits, no leading zero (so a bare local number without a
// country code is rejected). 256700000000 = 12 digits.
const PHONE_RE = /^[1-9]\d{9,14}$/;

/** Strip everything except digits (drops "+", spaces, hyphens, parens). */
export function normalizePhone(value: string): string {
  return (value ?? "").replace(/\D/g, "");
}

export function isValidPhone(value: string): boolean {
  return PHONE_RE.test(normalizePhone(value));
}

/**
 * "" when valid. Otherwise a message. An empty value only errors when required;
 * a non-empty value must be a valid international number.
 */
export function phoneError(value: string, required: boolean): string {
  const v = (value ?? "").trim();
  if (!v) return required ? "Phone number is required" : "";
  return isValidPhone(v) ? "" : PHONE_HINT;
}

/**
 * The value to store after react-international-phone reports a change.
 *
 * The library leaves two things to the caller, and both bite:
 *
 *  1. Picking a country hands back that country's bare dial code and DROPS the
 *     number already typed. Correcting the flag means "same number, wrong
 *     country", so the national part is carried across instead of binned.
 *  2. A national trunk "0" is not part of the international number: 0700123456
 *     dialled from abroad is 256700123456, NOT 2560700123456. Left in, the number
 *     is still the right length, so it passes validation, but belongs to nobody.
 *
 * Returns digits only. A result equal to the dial code means "no number yet";
 * callers that treat an empty phone as empty should map that to "".
 */
export function nextPhoneValue(opts: {
  /** What the library reported, e.g. "+256 700 123 456". */
  phone: string;
  /** The now-selected country's dial code, from the change meta. */
  dial: string;
  /** The value before this change, digits only. */
  previousValue: string;
  /** The dial code before this change, how a country switch is detected. */
  previousDial: string;
}): string {
  const { phone, dial, previousValue, previousDial } = opts;
  const digits = normalizePhone(phone);

  // A country was picked and the library threw the number away: put it back.
  if (dial && dial !== previousDial && digits === dial) {
    const national = previousValue.startsWith(previousDial)
      ? previousValue.slice(previousDial.length)
      : "";

    if (national) return dial + national;
  }

  // Only trim once the dial code is actually present: part-way through typing one
  // there is no national part to trim, and slicing would eat the digits.
  if (dial && digits.startsWith(dial)) {
    const national = digits.slice(dial.length).replace(/^0+/, "");

    return national ? dial + national : dial;
  }

  // A local number typed after clearing the "+256" ("0772 123 456"): it belongs to
  // the selected country, without its trunk 0. Stored as digits with the code.
  if (digits.startsWith("0")) {
    const national = digits.replace(/^0+/, "");
    const code = dial || previousDial;

    return national && code ? code + national : digits;
  }

  return digits;
}

/**
 * Whatever was typed, as it is stored: digits with the country code, no "+".
 * A Ugandan mobile typed the local way (0772 123 456) gets its 256.
 */
export function toPhoneDigits(value: string | null | undefined): string {
  const digits = normalizePhone(value ?? "");
  return /^0?7\d{8}$/.test(digits) ? `256${digits.replace(/^0/, "")}` : digits;
}

/** A stored Ugandan mobile the way people type it (0772 123 456); "" for anything else. */
export function ugandanLocal(value: string | null | undefined): string {
  const d = toPhoneDigits(value);
  return /^2567\d{8}$/.test(d) ? `0${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}` : "";
}
