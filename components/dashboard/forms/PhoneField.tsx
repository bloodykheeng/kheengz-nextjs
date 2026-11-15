"use client";

import { useRef } from "react";
import { PhoneInput, defaultCountries, parseCountry } from "react-international-phone";
import "react-international-phone/style.css";
import { nextPhoneValue } from "@/lib/phone";

/**
 * A phone number with its country flag, for every form that takes one.
 *
 * Reports digits only with the country code and no "+" (256700000000), the form
 * the API stores and SMS dials. All the fiddly parts live here rather than being
 * re-typed per form: see nextPhoneValue() in lib/phone.ts for why a country switch
 * must carry the number over, and why a national trunk "0" has to go.
 *
 * An empty value means empty, not a bare dial code the API would reject.
 */

const DEFAULT_COUNTRY = "ug";
const DEFAULT_DIAL = "256";
/** Uganda alone: for a Mobile Money number, the only kind the provider can pay. */
const UGANDA_ONLY = defaultCountries.filter((c) => parseCountry(c).iso2 === DEFAULT_COUNTRY);

type Props = {
  /** Digits only, no "+". */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  disabled?: boolean;
  /** Extra classes on the control; `gip-phone` supplies the shared chrome. */
  className?: string;
  /**
   * A Mobile Money number: the flag is fixed to Uganda and +256 cannot be removed, so only
   * a Ugandan number can be typed. Contacts (users, buyers) leave this off: any country.
   */
  ugandaOnly?: boolean;
};

export default function PhoneField({
  value,
  onChange,
  onBlur,
  invalid = false,
  disabled = false,
  className = "",
  ugandaOnly = false,
}: Props) {
  // The selected country's dial code. Only onChange is told which country is
  // selected, and nextPhoneValue needs the PREVIOUS one to spot a switch.
  const dialRef = useRef(DEFAULT_DIAL);

  return (
    <PhoneInput
      defaultCountry={DEFAULT_COUNTRY}
      // Pinned to the top of the list: almost every user here is Ugandan, and the
      // library only scrolls to the selected country when its focused index CHANGES
      // on first open the index is already set, so the list would otherwise open
      // mid-alphabet. There is no search box; typing a letter jumps to it.
      preferredCountries={ugandaOnly ? undefined : [DEFAULT_COUNTRY]}
      countries={ugandaOnly ? UGANDA_ONLY : undefined}
      hideDropdown={ugandaOnly}
      forceDialCode={ugandaOnly}
      value={value ? `+${value}` : ""}
      onChange={(phone, meta) => {
        const dial = meta?.country?.dialCode ?? "";
        const previousDial = dialRef.current;

        if (dial) dialRef.current = dial;

        const next = nextPhoneValue({
          phone,
          dial,
          previousValue: value ?? "",
          previousDial,
        });

        onChange(next === dial ? "" : next);
      }}
      onBlur={onBlur}
      disabled={disabled}
      className={`gip-phone ${invalid ? "p-invalid" : ""} ${className}`}
    />
  );
}
