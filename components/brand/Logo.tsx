import React from "react";
import Link from "next/link";
import { APP_NAME } from "@/lib/brand";

/** The platform mark: a shopping bag carrying a K, royal green and gold (workspace D8). */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none">
      <rect width="48" height="48" rx="14" fill="#0e5e45" />
      <path d="M18.5 19v-2.5a5.5 5.5 0 0 1 11 0V19" stroke="#d9a21b" strokeWidth="2.6" strokeLinecap="round" />
      <rect x="12.5" y="19" width="23" height="18.5" rx="3.5" fill="#f8f5ee" />
      <path d="M20.5 23.5v10M20.5 28.6l6.6-5.1M22.6 27l4.6 6.5" stroke="#0e5e45" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Logo({ href = "/", light = false, className = "" }: { href?: string; light?: boolean; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className={`font-display text-2xl font-bold tracking-tight ${light ? "text-white" : "text-(--ink)"}`}>{APP_NAME}</span>
    </Link>
  );
}
