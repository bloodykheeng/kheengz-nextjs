"use client";

import React, { useEffect, useState } from "react";
import { Dialog } from "primereact/dialog";
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
  accept: () => Promise<unknown>;
}

type Listener = (options: ConfirmOptions | null) => void;
let listener: Listener | null = null;

export function confirmAction(options: ConfirmOptions): void {
  listener?.(options);
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
      // The global mutation error toast explains it; the dialog stays for another try.
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
