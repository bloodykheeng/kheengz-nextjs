"use client";

import { useTheme } from "@/contexts/ThemeContext";

/**
 * PrimeReact's lara theme, light or dark with the theme, imported into the `primereact` cascade
 * layer declared at the top of app/globals.css. A <link> cannot be put in a layer, and as a
 * plain <link> rendered here it would land after our own stylesheets and override them; inside
 * the layer it sits below Tailwind's utilities and our overrides wherever it lands. Mounted by
 * SessionProviders, so only dashboard and sign-in pages download it, never the storefront.
 */
export default function PrimeReactTheme() {
  const { theme } = useTheme();
  const css = `@import url("/themes/lara-${theme}-emerald/theme.css") layer(primereact);`;

  return <style>{css}</style>;
}
