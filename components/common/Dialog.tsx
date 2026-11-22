"use client";

import React, { useLayoutEffect, useState } from "react";
import { Dialog as PrimeDialog, type DialogProps } from "primereact/dialog";

/**
 * PrimeReact's Dialog, made safe for Next keeping a page you leave mounted but hidden (React's Activity, with
 * Cache Components). Leaving while a dialog fades out (a link out of it) cut its close short: coming back found
 * it half closed, deaf to Close, its mask blocking every click on the page (Letshego, 30 Oct 2026). Hiding the
 * page now remounts the dialog, so it comes back as its parent says, closed or open. Next's guide:
 * node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md (reset on hide in a layout effect's
 * cleanup). Every dialog imports this one, never PrimeReact's directly (docs/dashboard-patterns.md §18).
 */
export function Dialog(props: DialogProps) {
  const [mount, setMount] = useState(0);
  useLayoutEffect(() => () => setMount((m) => m + 1), []);
  return <PrimeDialog key={mount} {...props} />;
}
