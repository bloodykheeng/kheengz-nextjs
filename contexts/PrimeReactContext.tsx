"use client";
import { PrimeReactProvider } from "primereact/api";

export default function PrimeReactContext({
  children,
}: {
  children: React.ReactNode;
}) {
  // NO `pt: Tailwind`. That passthrough preset is built for `unstyled: true`, and it
  // replaces a theme rather than decorating one. Layered on top of a styled lara
  // theme it stamped literal utility classes onto every part, e.g. the Dropdown's
  // items-wrapper got `bg-white … dark:bg-gray-900`. Those classes live in
  // node_modules, which Tailwind 4 does not scan, so `.bg-white` was emitted (our
  // own source uses it) while `.dark\:bg-gray-900` never was, so every portaled
  // panel painted itself white in dark mode and no override could reach it,
  // because the white was on the wrapper *inside* .p-dropdown-panel. It also
  // capped inputs at `md:w-56`, which is what shortened the password field.
  // Dark mode is handled by PrimeReactTheme loading lara-dark-emerald plus the token
  // overrides in app/primereact-theme.css. Do not add the preset back.
  return <PrimeReactProvider value={{ unstyled: false }}>{children}</PrimeReactProvider>;
}
