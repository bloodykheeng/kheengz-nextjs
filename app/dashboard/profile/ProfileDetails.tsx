"use client";

import React, { useState } from "react";
import { Tag } from "primereact/tag";
import { Button } from "primereact/button";
import { useAuth } from "@/contexts/AuthContext";
import { useOnlineStatus } from "@/contexts/OnlineStatusContext";
import EditProfileDialog from "./EditProfileDialog";

/**
 * Blank-safe label/value pair, matching the details dialogs elsewhere.
 *
 * `loading` matters more than it looks: without it a field the request has not
 * answered for yet renders as "Not set", which is a claim about the data rather
 * than an admission that it has not arrived.
 */
function Field({
  label,
  value,
  loading,
}: {
  label: string;
  value?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
        {label}
      </p>
      {loading ? (
        <div className="h-5 w-28 animate-pulse rounded bg-(--bg-page)" />
      ) : (
        <div className="wrap-break-word text-sm text-(--text-primary)">
          {value || <span className="text-(--text-muted)">Not set</span>}
        </div>
      )}
    </div>
  );
}

/**
 * A card. `collapsible` starts closed and reveals on click, for content that is
 * reference material rather than something you came to the page to read.
 */
function Section({
  title,
  note,
  children,
  collapsible = false,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isOpen = !collapsible || open;

  return (
    <section className="rounded-xl border border-(--border-color) bg-(--bg-card) p-5">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-start justify-between gap-4 text-left"
        >
          <span>
            <span className="block text-sm font-semibold text-(--text-primary)">
              {title}
            </span>
            {note && (
              <span className="mt-0.5 block text-xs text-(--text-muted)">{note}</span>
            )}
          </span>
          <i
            className={`pi pi-chevron-down mt-0.5 shrink-0 text-xs text-(--text-muted) transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      ) : (
        <>
          <h2 className="text-sm font-semibold text-(--text-primary)">{title}</h2>
          {note && <p className="mt-0.5 text-xs text-(--text-muted)">{note}</p>}
        </>
      )}
      {isOpen && <div className="mt-4">{children}</div>}
    </section>
  );
}

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString() : "";

export default function ProfileDetails() {
  // Permissions come from AuthContext, not from the query below. The dashboard
  // shell already blocks on its profile load, so they are present on the first
  // paint here; reading them off the second request instead was what made the
  // card render "Permissions (0)" and then fill in.
  const { user: contextUser, permissions, isProfileLoading } = useAuth();
  const { isOnline } = useOnlineStatus();
  const [editing, setEditing] = useState(false);

  // AuthContext already holds the full profile (the API's UserResource, nothing to include),
  // so the page reads it rather than asking again.
  const a = contextUser;
  const id = contextUser?.id;
  const online = id ? isOnline(id) : false;

  if (isProfileLoading && !a) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-xl border border-(--border-color) bg-(--bg-card)"
          />
        ))}
      </div>
    );
  }

  if (!a) {
    return (
      <p className="text-sm text-(--text-muted)">
        Your profile could not be loaded. Try refreshing the page.
      </p>
    );
  }

  const initials =
    a.name
      ?.split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  return (
    <div className="space-y-4">
      {/* Identity */}
      <section className="flex flex-wrap items-center gap-4 rounded-xl border border-(--border-color) bg-(--bg-card) p-5">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-(--brand) text-xl font-semibold text-white">
            {initials}
          </div>
          <span
            title={online ? "Online now" : "Offline"}
            className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-(--bg-card) ${
              online ? "bg-green-500" : "bg-gray-400"
            }`}
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-(--text-primary)">
            {a.name}
          </p>
          <p className="truncate text-sm text-(--text-muted)">{a.email || a.phone || a.username}</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Tag value={a.role} className="text-xs" />
          <Tag
            value={a.status}
            severity={a.status === "Active" ? "success" : "warning"}
            className="text-xs"
          />
          {/* No permission gate: everyone may edit their own account, and the
              API's current-password check is the real guard. */}
          <Button
            label="Edit profile"
            icon="pi pi-pencil"
            size="small"
            onClick={() => setEditing(true)}
          />
        </div>
      </section>

      {editing && (
        <EditProfileDialog
          visible={editing}
          onHide={() => setEditing(false)}
          attributes={a}
        />
      )}

      {/* Account */}
      <Section
        title="Account"
        note="Use Edit profile to change your name, email, username, phone, photo or password."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Username" value={a.username} />
          <Field label="Phone" value={a.phone} />
          <Field label="Timezone" value={a.timezone} />
          <Field
            label="Notifications"
            value={a.allow_notifications ? "On" : "Off"}
          />
          <Field label="Email confirmed" value={a.email_verified_at ? fmt(a.email_verified_at) : "Not yet"} />
          <Field label="Last login" value={fmt(a.lastlogin)} />
          <Field label="Member since" value={fmt(a.created_at)} />
          <Field
            label="Identifier"
            value={<span className="font-mono text-xs">{id}</span>}
          />
        </div>
      </Section>

      {/* Permissions */}
      {/* Collapsed by default: 22 chips is reference material you occasionally
          check, not something worth pushing the rest of the page down for. */}
      <Section
        title={isProfileLoading ? "Permissions" : `Permissions (${permissions.length})`}
        note="Determined by your role. These control the actions available to you."
        collapsible
      >
        {isProfileLoading ? (
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-6 w-24 animate-pulse rounded-md bg-(--bg-page)"
              />
            ))}
          </div>
        ) : permissions.length === 0 ? (
          <p className="text-sm text-(--text-muted)">No permissions granted.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {permissions.map((permission) => (
              <li
                key={permission}
                className="rounded-md border border-(--border-color) bg-(--bg-page) px-2.5 py-1 text-xs capitalize text-(--text-secondary)"
              >
                {permission}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
