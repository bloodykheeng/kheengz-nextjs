"use client";

import { useEffect } from "react";
import { APP_NAME } from "@/lib/brand";

/**
 * The last guard: shown when the root layout itself crashes (Next.js global-error.js), in place of the bare white
 * "Application error" screen. It replaces the whole document, so it has its own <html> and <body>, no global CSS and
 * no providers: inline styles only, and the viewer's own light or dark preference (docs/dashboard-patterns.md §18).
 * Pages crash into error.tsx first; this is for what is above them.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" translate="no">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", colorScheme: "light dark", background: "Canvas", color: "CanvasText" }}>
        <title>{`Something went wrong | ${APP_NAME}`}</title>
        <main role="alert" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 440, textAlign: "center" }}>
            <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>{APP_NAME} could not be shown</h1>
            <p style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.8, margin: "0 0 20px" }}>
              Something went wrong while opening the page. Nothing you saved is affected. If a browser translator is on for
              this site, turn it off. Then try again.
            </p>
            <button
              type="button"
              onClick={() => retry()}
              style={{ background: "#0E5E45", color: "#fff", border: 0, borderRadius: 8, padding: "10px 18px", fontSize: 14, cursor: "pointer", marginRight: 8 }}
            >
              Try again
            </button>
            {/* A plain form GET: a full page load that needs no script, since the app around this page is what failed. */}
            <form action="/" method="get" style={{ display: "inline" }}>
              <button type="submit" style={{ background: "none", color: "inherit", border: "1px solid currentColor", borderRadius: 8, padding: "9px 17px", fontSize: 14, cursor: "pointer" }}>
                Go to the start page
              </button>
            </form>
          </div>
        </main>
      </body>
    </html>
  );
}
