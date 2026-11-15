"use client";

import { MdLightMode, MdDarkMode } from "react-icons/md";
import { useTheme } from "@/contexts/ThemeContext";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      className="flex h-9 w-9 items-center justify-center rounded-lg text-(--text-secondary) transition-colors hover:bg-(--sidebar-hover-bg) hover:text-(--text-primary)"
    >
      {/* we use tailwind to render to prevent hydartion misamatches cause if we use  conditional render {isDark ? "dark" : "light"} we get error since server has no local storage */}
      {/* Sun: shown in dark mode */}
      <MdLightMode className="hidden text-xl dark:block" />
      {/* Moon: shown in light mode */}
      <MdDarkMode className="block text-xl dark:hidden" />
    </button>
  );
}
