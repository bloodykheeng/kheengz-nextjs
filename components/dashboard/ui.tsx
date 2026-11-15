"use client";

import React from "react";
import { Tag } from "primereact/tag";
import { InputSwitch } from "primereact/inputswitch";
import BaseChart from "@/components/common/charts/BaseChart";
import type { DailyPoint } from "@/services/types/kheengz";
import { ugx, ugxShort } from "@/lib/format";

/** Shared pieces for every dashboard screen. */

export function PageHeader({ title, subtitle, actions }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold text-(--text-primary)">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-(--text-muted)">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className = "", padded = true }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; padded?: boolean }) {
  return (
    // min-w-0: a grid or flex item otherwise grows to its longest line and pushes the page sideways on a phone.
    <section className={`min-w-0 rounded-2xl border border-(--border-color) bg-(--bg-card) shadow-(--shadow-sm) ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-(--border-color) px-5 py-3.5">
          {title && <h2 className="text-sm font-semibold text-(--text-primary)">{title}</h2>}
          {actions}
        </header>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "brand",
  loading = false,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: string;
  tone?: "brand" | "accent" | "info" | "danger" | "muted";
  loading?: boolean;
}) {
  const tones: Record<string, string> = {
    brand: "bg-(--brand-light) text-(--brand-ink) dark:bg-(--brand)/25 dark:text-emerald-300",
    accent: "bg-(--accent-light) text-(--accent) dark:bg-amber-900/30 dark:text-amber-300",
    info: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    danger: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300",
    muted: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };
  return (
    <div className="rounded-2xl border border-(--border-color) bg-(--bg-card) p-5 shadow-(--shadow-sm)">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">{label}</p>
        {icon && (
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>
            <span className={`pi ${icon} text-sm`} aria-hidden />
          </span>
        )}
      </div>
      {loading ? (
        <div className="mt-3 h-7 w-28 animate-pulse rounded bg-(--border-color)" />
      ) : (
        <p className="mt-2 text-2xl font-bold tracking-tight text-(--text-primary)">{value}</p>
      )}
      {hint && <p className="mt-1 text-xs text-(--text-muted)">{hint}</p>}
    </div>
  );
}

type Severity = "success" | "info" | "warning" | "danger" | "secondary" | "contrast";

// Each Phase 1 module adds its statuses here (an order's, a payout's), from its Laravel enum.
const SEVERITY: Record<string, Severity> = {
  // payments, jobs, messages
  Pending: "warning",
  Successful: "success",
  Failed: "danger",
  Cancelled: "secondary",
  Paid: "success",
  Rejected: "danger",
  Queued: "secondary",
  Sending: "info",
  Completed: "success",
  Sent: "success",
  // records (RecordStatus), shops (ShopStatus)
  Active: "success",
  Inactive: "secondary",
  Draft: "secondary",
  "Pending review": "warning",
  "Changes requested": "warning",
  Suspended: "danger",
  Closed: "secondary",
  // vendors (VendorStatus), payout destinations
  Approved: "success",
  Verified: "success",
  "Awaiting review": "warning",
};

const LABEL: Record<string, string> = { Successful: "Paid" };

/** A status as a coloured tag. "Successful" reads "Paid" to a vendor; `raw` shows the stored word. */
export function StatusTag({ status, raw = false }: { status: string; raw?: boolean }) {
  return <Tag value={raw ? status : (LABEL[status] ?? status)} severity={SEVERITY[status] ?? "secondary"} className="text-xs" />;
}

export function EmptyState({ icon = "pi-inbox", title, body, action }: { icon?: string; title: string; body?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-(--border-color) px-6 py-14 text-center">
      <span className={`pi ${icon} text-3xl text-(--text-muted)`} aria-hidden />
      <p className="text-base font-semibold text-(--text-primary)">{title}</p>
      {body && <p className="max-w-md text-sm text-(--text-muted)">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** A form field: a short label over the input, then one line of help or the error. */
export function Field({ label, required, hint, error, htmlFor, children, className = "" }: {
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string | null;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const caption = (
    <>
      {label}
      {required && (
        <span aria-hidden className="text-red-500">
          {" "}*
        </span>
      )}
    </>
  );

  return (
    // data-invalid turns every control inside red (app/globals.css, "Invalid fields").
    <div className={`min-w-0 space-y-1.5 ${className}`} data-invalid={error ? "true" : undefined}>
      {htmlFor ? (
        <>
          <label htmlFor={htmlFor} className="block text-sm font-medium text-(--text-primary)">{caption}</label>
          {children}
        </>
      ) : (
        // No id to point at: the label wraps its control, so the browser and screen readers name the
        // control by it (and a test finds it by its label) without every form inventing ids.
        <label className="block space-y-1.5">
          <span className="block text-sm font-medium text-(--text-primary)">{caption}</span>
          {children}
        </label>
      )}
      {error ? <small className="block text-xs text-red-500">{error}</small> : hint && <small className="block text-xs text-(--text-muted)">{hint}</small>}
    </div>
  );
}

/**
 * An on/off setting: the label and one line of help on the left, the switch on
 * the right at its own size (in a narrow flex row a switch otherwise squashes).
 */
export function SwitchRow({ label, hint, checked, onChange, disabled }: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-center justify-between gap-4 py-3 ${disabled ? "opacity-60" : "cursor-pointer"}`}>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-(--text-primary)">{label}</span>
        {hint && <span className="block text-xs text-(--text-muted)">{hint}</span>}
      </span>
      <InputSwitch checked={checked} onChange={(e) => onChange(!!e.value)} disabled={disabled} className="shrink-0" />
    </label>
  );
}

export function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-(--border-color) ${className}`}>
      <span className="block h-full rounded-full bg-linear-to-r from-(--brand) to-(--accent-mid) transition-all duration-700" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

/** Money received per day over the last 30 days. */
export function MoneyTrendChart({ points, title = "Money received, last 30 days" }: { points: DailyPoint[]; title?: string }) {
  return (
    <BaseChart
      height={260}
      exportTitle={title}
      options={{
        chart: { type: "area" },
        xAxis: {
          categories: points.map((p) => new Date(p.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })),
          tickInterval: 5,
        },
        yAxis: { title: { text: undefined }, labels: { formatter() { return ugxShort(Number(this.value)).replace("UGX ", ""); } } },
        legend: { enabled: false },
        tooltip: {
          formatter() {
            const p = points[Number(this.index)];
            return `<b>${new Date(p.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</b><br/>${ugx(p.amount)}${p.count !== undefined ? ` · ${p.count} order${p.count === 1 ? "" : "s"}` : ""}`;
          },
        },
        plotOptions: { area: { fillOpacity: 0.15, marker: { enabled: false } } },
        series: [{ type: "area", name: "Received", data: points.map((p) => p.amount) }],
      }}
    />
  );
}

/** MTN and Airtel as a donut: how buyers paid. */
export function NetworkDonut({ rows }: { rows: { network: string | null; amount: number; count: number }[] }) {
  return (
    <BaseChart
      height={240}
      exportTitle="Payments by network"
      options={{
        chart: { type: "pie" },
        tooltip: { pointFormatter() { return `${ugx(Number(this.y))} · ${(this as unknown as { count: number }).count} payments`; } },
        plotOptions: { pie: { innerSize: "62%", dataLabels: { enabled: true, format: "{point.name}: {point.percentage:.0f}%" } } },
        series: [
          {
            type: "pie",
            name: "Network",
            data: rows.map((r) => ({
              name: r.network ?? "Other",
              y: r.amount,
              count: r.count,
              color: r.network === "MTN" ? "#f5c400" : r.network === "Airtel" ? "#e40000" : undefined,
            })),
          },
        ],
      }}
    />
  );
}
