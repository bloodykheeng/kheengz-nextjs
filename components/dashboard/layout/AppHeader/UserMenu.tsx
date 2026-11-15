"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { MdPerson, MdLogout, MdKeyboardArrowDown } from "react-icons/md";
import { useAuth } from "@/contexts/AuthContext";

/** The signed-in account in the header: who, which role, the profile and signing out. */
export default function UserMenu() {
  const { logoutMutation, user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Before the profile lands, a neutral placeholder: never a made-up admin.
  const name = user?.name || "Account";
  const contact = user?.email ?? user?.phone ?? "";
  const role = user?.role ?? "";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex min-h-11 items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-(--sidebar-hover-bg)"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--brand) text-sm font-semibold text-white">
          {initials}
        </span>
        {/* Capped and truncated so a long shop or business name cannot push the header across;
            `title` gives it in full on hover and the open menu shows it whole. */}
        <span className="hidden max-w-36 text-left md:block lg:max-w-48">
          <span title={name} className="block truncate text-sm font-medium leading-tight text-(--text-primary)">
            {name}
          </span>
          <span className="block truncate text-xs leading-tight text-(--text-muted)">{role}</span>
        </span>
        <MdKeyboardArrowDown className={`text-(--text-muted) transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-xl border border-(--border-color) bg-(--bg-card) py-1 shadow-(--shadow-md)">
          <div className="border-b border-(--border-color) px-4 py-3">
            {/* In full here, wrapping: the trigger above defers to this. */}
            <p className="wrap-break-word text-sm font-semibold text-(--text-primary)">{name}</p>
            <p className="truncate text-xs text-(--text-muted)">{contact}</p>
            <p className="mt-1 text-xs font-medium text-(--brand-ink)">{role}</p>
          </div>

          <div className="py-1">
            <Link
              href="/dashboard/profile"
              onClick={() => setOpen(false)}
              className="flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-sm text-(--text-secondary) transition-colors hover:bg-(--sidebar-hover-bg)"
            >
              <MdPerson className="text-lg text-(--text-muted)" />
              My profile
            </Link>
          </div>
          <div className="border-t border-(--border-color) py-1">
            <button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-red-950/40"
            >
              {logoutMutation.isPending ? <span className="pi pi-spin pi-spinner text-lg" /> : <MdLogout className="text-lg" />}
              {logoutMutation.isPending ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
