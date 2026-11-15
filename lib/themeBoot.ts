import { THEME_COOKIE } from "@/lib/authCookies";

/**
 * Runs before the first paint (next/script `beforeInteractive`, in the root layout): on a
 * dashboard or sign-in page whose viewer chose dark, it puts the dark class on <html> at once, so
 * there is no light flash while React loads. Storefront pages keep the shop's own look, so it does
 * nothing there. After that, contexts/ThemeContext.tsx owns the theme (and takes the class off
 * again when someone leaves for the storefront).
 *
 * A plain module, not the "use client" ThemeContext: a server layout importing a string from a
 * client module gets a client reference, not the string.
 */
export const THEME_BOOT_SCRIPT = [
  "try{",
  'if(/^\\/(dashboard|login|forgot-password|sell)(\\/|$)/.test(location.pathname)',
  `&&document.cookie.split("; ").indexOf("${THEME_COOKIE}=dark")>-1){`,
  'var h=document.documentElement;h.classList.add("dark");h.style.colorScheme="dark";',
  "}}catch(e){}",
].join("");
