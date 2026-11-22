"use client";

import React from "react";
import { Dialog } from "@/components/common/Dialog";
import { Button } from "primereact/button";
import { dateTime } from "@/lib/format";
import { asDate, type ExportColumn } from "@/lib/exportRows";
import type { Audited, UserReference } from "@/services/types/kheengz";

export type { Audited, UserReference };

/**
 * Who made a record and who last changed it, the way Alpha and SDS show it:
 * four columns every list carries, hidden until switched on from the column
 * menu, and the same four at the foot of every details dialog.
 */


/** The same four facts as typed spreadsheet cells, for an `exportAll` column list. */
export function auditExportColumns<T extends Audited>({ people = true }: { people?: boolean } = {}): ExportColumn<T>[] {
  return [
    { header: "Created", value: (row) => asDate(row.created_at) },
    ...(people ? [{ header: "Created by", value: (row: T) => row.created_by?.name }] : []),
    { header: "Updated", value: (row) => asDate(row.updated_at) },
    ...(people ? [{ header: "Updated by", value: (row: T) => row.updated_by?.name }] : []),
  ];
}

/** A person in a table cell: name, and the email under it. */
export function UserReferenceCell({ user }: { user?: UserReference | null }) {
  if (!user) return <span className="text-(--text-muted)">N/A</span>;
  return (
    <div className="min-w-0">
      <p className="truncate text-sm text-(--text-primary)">{user.name}</p>
      {user.email && <p className="truncate text-xs text-(--text-muted)">{user.email}</p>}
    </div>
  );
}

/**
 * The four audit columns, hidden by default. Records written by buyers (an
 * order, a review) have no `created_by`: pass `people: false`.
 */
export function auditColumns<T extends Audited>({ people = true, updated = true }: { people?: boolean; updated?: boolean } = {}) {
  return [
    {
      field: "created_at",
      header: "Created",
      type: "date",
      sortable: true,
      visible: false,
      body: (row: T) => <span className="text-sm text-(--text-muted)">{dateTime(row.created_at)}</span>,
      exportValue: (row: T) => row.created_at ?? "",
    },
    ...(updated
      ? [
          {
            field: "updated_at",
            header: "Updated",
            type: "date",
            visible: false,
            body: (row: T) => <span className="text-sm text-(--text-muted)">{dateTime(row.updated_at)}</span>,
            exportValue: (row: T) => row.updated_at ?? "",
          },
        ]
      : []),
    ...(people
      ? [
          {
            field: "created_by.name",
            header: "Created by",
            visible: false,
            body: (row: T) => <UserReferenceCell user={row.created_by} />,
            exportValue: (row: T) => row.created_by?.name ?? "",
          },
          ...(updated
            ? [
                {
                  field: "updated_by.name",
                  header: "Updated by",
                  visible: false,
                  body: (row: T) => <UserReferenceCell user={row.updated_by} />,
                  exportValue: (row: T) => row.updated_by?.name ?? "",
                },
              ]
            : []),
        ]
      : []),
  ];
}

const person = (user?: UserReference | null) => (user ? `${user.name}${user.email ? ` · ${user.email}` : ""}` : "N/A");

/** The audit block at the foot of a details dialog. */
export function AuditDetails({ record, people = true }: { record: Audited; people?: boolean }) {
  const cells: [string, string][] = [
    ["Created", dateTime(record.created_at) || "N/A"],
    ["Last updated", dateTime(record.updated_at) || "N/A"],
    ...(people
      ? ([
          ["Created by", person(record.created_by)],
          ["Updated by", person(record.updated_by)],
        ] as [string, string][])
      : []),
  ];

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-3 border-t border-(--border-color) pt-4 text-sm sm:grid-cols-2">
      {cells.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <p className="mb-0.5 text-xs text-(--text-muted)">{label}</p>
          <p className="wrap-break-word text-(--text-secondary)">{value}</p>
        </div>
      ))}
    </div>
  );
}

export interface DetailField {
  label: string;
  value: React.ReactNode;
  /** Spans both columns: long text such as a message or a description. */
  wide?: boolean;
}

/**
 * A record's details, read only: its fields in two columns, then who made and
 * changed it. One shape for every list's eye button.
 */
export function RecordDetailsDialog({
  header,
  visible,
  onHide,
  record,
  fields,
  people = true,
  children,
  footer,
}: {
  header: React.ReactNode;
  visible: boolean;
  onHide: () => void;
  record: Audited | null;
  fields: DetailField[];
  /** False for records written by buyers, which have no creator account. */
  people?: boolean;
  /** Anything below the fields and above the audit block (a list, a message). */
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Dialog
      header={header}
      visible={visible}
      onHide={onHide}
      style={{ width: "min(40rem, 95vw)" }}
      modal
      maximizable
      footer={footer ?? <Button label="Close" text onClick={onHide} />}
    >
      {record && (
        <div className="space-y-5">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {fields.map((f, i) => (
              // Index too: two fields may share a label, and a repeated key drops one of them.
              <div key={`${i}-${f.label}`} className={`min-w-0 ${f.wide ? "sm:col-span-2" : ""}`}>
                <dt className="mb-0.5 text-xs text-(--text-muted)">{f.label}</dt>
                <dd className="wrap-break-word text-(--text-primary)">{f.value ?? "N/A"}</dd>
              </div>
            ))}
          </dl>
          {children}
          <AuditDetails record={record} people={people} />
        </div>
      )}
    </Dialog>
  );
}
