"use client";

import React, { useEffect, useState } from "react";
import { Dialog } from "@/components/common/Dialog";
import { Button } from "primereact/button";

/**
 * Confirm, then do it, in the same dialog (Alpha's DeleteRecordsDialog pattern).
 *
 * PrimeReact's confirmDialog() closes the moment Yes is pressed, so the work
 * runs out of sight and the screen looks as if nothing happened. Here `accept`
 * returns the request's promise: the dialog stays open with a spinner and
 * cannot be closed until it settles, closes when it succeeds, and stays open
 * when it fails (the global error toast says why) so it can be tried again.
 *
 *   confirmAction({ header, message, acceptLabel, accept: () => mutation.mutateAsync(x) })
 *
 * One <ConfirmActionHost /> in the dashboard shell renders it.
 */
export interface ConfirmOptions {
  header: string;
  message: React.ReactNode;
  acceptLabel?: string;
  /** Red accept button, for removing things. */
  danger?: boolean;
  /** Shown instead of Cancel/accept when the action cannot be done (e.g. a product with orders). */
  blocked?: boolean;
  /**
   * Close when `accept` fails instead of staying for another try: for a form, whose 422 errors are shown on its
   * own fields, behind this dialog (confirmSubmit).
   */
  closeOnError?: boolean;
  accept: () => Promise<unknown>;
}

type Listener = (options: ConfirmOptions | null) => void;
let listener: Listener | null = null;

export function confirmAction(options: ConfirmOptions): void {
  listener?.(options);
}

/**
 * "Are you sure?" before a create or edit form is sent ("Confirm submission", the coding notes' rule). Call it
 * from the form's `handleSubmit`, so only a valid form is confirmed:
 *
 *   handleSubmit((v) => confirmSubmit("this category", () => save.mutateAsync(v)))
 *
 * Yes sends it with a spinner; success closes this and the form (the mutation's onSuccess); a refusal closes
 * this so the API's errors show on the form's fields.
 */
export function confirmSubmit(what: string, accept: () => Promise<unknown>): void {
  confirmAction({
    header: "Confirm submission",
    message: `Are you sure you want to save ${what}?`,
    acceptLabel: "Yes, save",
    closeOnError: true,
    accept,
  });
}

/**
 * A form dialog's close handler: closing with changes asks first, since a half-typed record is easy to lose by a
 * stray click; nothing closes while it is saving. Use it as the dialog's `onHide` and its Cancel.
 */
export function guardedClose(isDirty: boolean, isPending: boolean, onHide: () => void) {
  return () => {
    if (isPending) return;
    if (!isDirty) return onHide();
    confirmAction({
      header: "Discard your changes?",
      message: "What you typed in this form will be lost.",
      acceptLabel: "Discard",
      danger: true,
      accept: async () => onHide(),
    });
  };
}

export function ConfirmActionHost() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    listener = (next) => {
      setPending(false);
      setOptions(next);
    };
    return () => {
      listener = null;
    };
  }, []);

  const close = () => {
    if (!pending) setOptions(null);
  };

  const run = async () => {
    if (!options) return;
    setPending(true);
    try {
      await options.accept();
      setOptions(null);
    } catch {
      // The global mutation error toast explains it; the dialog stays for another try,
      // unless the form behind it shows the errors itself.
      if (options.closeOnError) setOptions(null);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      header={options?.header}
      visible={!!options}
      onHide={close}
      closable={!pending}
      closeOnEscape={!pending}
      style={{ width: "min(30rem, 95vw)" }}
      modal
      footer={
        options && (
          <div className="flex justify-end gap-2">
            <Button type="button" label={options.blocked ? "Close" : "Cancel"} text onClick={close} disabled={pending} />
            {!options.blocked && (
              <Button
                type="button"
                label={options.acceptLabel ?? "Confirm"}
                severity={options.danger ? "danger" : undefined}
                loading={pending}
                onClick={run}
                autoFocus
              />
            )}
          </div>
        )
      }
    >
      <div className="text-sm leading-relaxed text-(--text-secondary)">{options?.message}</div>
    </Dialog>
  );
}
