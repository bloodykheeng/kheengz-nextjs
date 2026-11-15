"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";
import Cookies from "js-cookie";
import { THEME_COOKIE } from "@/lib/authCookies";

export type Theme = "light" | "dark";

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

// Named ThemeCtx so it does not clash with the exported provider component below.
const ThemeCtx = createContext<ThemeContextType | undefined>(undefined);

// The cookie is the store: read in the browser only, so the server renders light and the
// browser switches after hydration without a mismatch (useSyncExternalStore).
const listeners = new Set<() => void>();
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
const readTheme = (): Theme => (Cookies.get(THEME_COOKIE) === "dark" ? "dark" : "light");
const serverTheme = (): Theme => "light";

/** Puts the theme on <html> (Tailwind's `dark:` variant, native controls) and Highcharts' body classes. */
function applyTheme(theme: Theme): void {
  const isDark = theme === "dark";
  const html = document.documentElement;

  html.classList.toggle("dark", isDark);
  html.classList.toggle("light", !isDark);
  html.style.colorScheme = theme;
  html.setAttribute("data-theme", theme);

  document.body.classList.toggle("highcharts-dark", isDark);
  document.body.classList.toggle("highcharts-light", !isDark);
}

/**
 * The inline script the dashboard and sign-in layouts put before their content: it applies a
 * dark theme before the first paint, so a dark-mode user never sees a light flash while React
 * loads. Built from THEME_COOKIE so the two can never disagree on the name.
 */
export const THEME_BOOT_SCRIPT = [
  "try{",
  `if(document.cookie.split("; ").indexOf("${THEME_COOKIE}=dark")>-1){`,
  'var h=document.documentElement;h.classList.add("dark");h.style.colorScheme="dark";',
  "}}catch(e){}",
].join("");

/**
 * Light or dark for the dashboards and sign-in pages. Storefront pages use the shop's own look,
 * so leaving these pages takes the dark class off again.
 */
export function ThemeContext({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, readTheme, serverTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => () => applyTheme("light"), []);

  const setTheme = useCallback((next: Theme) => {
    Cookies.set(THEME_COOKIE, next, { expires: 365, sameSite: "lax" });
    listeners.forEach((listener) => listener());
  }, []);

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeCtx);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeContext");
  }
  return context;
}
