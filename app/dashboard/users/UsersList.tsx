"use client";

import React, { useState } from "react";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { InputText } from "primereact/inputtext";
import { confirmAction } from "@/components/dashboard/ConfirmAction";
import type { DataTablePageEvent, DataTableSortEvent } from "primereact/datatable";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PrimeReactDataTable, { createAction, deleteSelectedAction, editAction, viewAction } from "@/components/dashboard/tables/PrimeReactDataTable";
import { RecordDetailsDialog, auditColumns, auditExportColumns } from "@/components/dashboard/audit";
import FiltersButton, { filterValuesFrom, type FilterGroup } from "@/components/dashboard/filters/FiltersButton";
import { optionsOf } from "@/components/dashboard/filters/pickers";
import { useListParams, columnSortToParam, DEFAULT_PAGE } from "@/hooks/useListParams";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import UserFormDialog, { ROLES } from "@/components/dashboard/admin/UserFormDialog";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { deleteUser, deleteUsers, getUsers, resendVerificationCode, type User } from "@/services/users/users-service";
import { PageHeader, StatusTag } from "@/components/dashboard/ui";
import { dateTime, initials } from "@/lib/format";
import { asDate, type ExportColumn } from "@/lib/exportRows";
import { LuMailCheck } from "react-icons/lu";
import { APP_NAME } from "@/lib/brand";
import { useResetWhen } from "@/hooks/useResetOnOpen";
import { useTicked } from "@/hooks/useTicked";

const EMAIL_STATUSES = ["Confirmed", "Not confirmed"] as const;
const emailStatus = (u: User) => (u.email_verified_at ? "Confirmed" : "Not confirmed");

/** Whether they entered the sign-up code. Separate from Status, which is the Admin's on/off switch. */
function EmailTag({ user }: { user: User }) {
  return <Tag value={emailStatus(user)} severity={user.email_verified_at ? "success" : "warning"} className="text-xs" />;
}

/** Every account: the platform's Admins and Staff, and vendors. Buyers never have one. */
export default function UsersList() {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const { user: me } = useAuth();
  const canManage = can("manage users");
  const { page, pageSize, search, status, sort, sortField, sortOrder, first, getParam, pushParams, setFilters } = useListParams();
  const role = getParam("role");
  const emailStatusFilter = getParam("email_status");
  const filterGroups: FilterGroup[] = [
    { title: "Account", fields: [
      { type: "select", key: "role", label: "Role", options: ROLES, placeholder: "Any role" },
      { type: "select", key: "status", label: "Status", options: optionsOf(["Active", "Inactive"]), placeholder: "Any status" },
      { type: "select", key: "email_status", label: "Email", options: optionsOf([...EMAIL_STATUSES]), placeholder: "Confirmed or not" },
    ] },
  ];
  const [searchInput, setSearchInput] = useState(search);
  // Follows the URL (Back, a cleared chip) before the paint, not after it.
  useResetWhen(search, () => setSearchInput(search));

  const filters = { "filter[search]": search || undefined, "filter[status]": status || undefined, "filter[role]": role || undefined, "filter[email_status]": emailStatusFilter || undefined, sort: sort || undefined, include: "created_by,updated_by" };
  const query = useQuery({
    queryKey: ["users", page, pageSize, search, status, role, emailStatusFilter, sort],
    queryFn: () => getUsers({ ...filters, page, per_page: pageSize }),
    placeholderData: (previous) => previous,
  });

  // The table's Export walks every page with these filters (ExportDialog).
  const exportFetch = (p: number, pp: number) => getUsers({ ...filters, page: p, per_page: pp });
  const exportColumns: ExportColumn<User>[] = [
    { header: "Name", value: (u) => u.name },
    { header: "Email", value: (u) => u.email },
    { header: "Phone", value: (u) => u.phone },
    { header: "Role", value: (u) => u.role },
    { header: "Status", value: (u) => u.status },
    { header: "Email", value: emailStatus },
    { header: "Email confirmed", value: (u) => asDate(u.email_verified_at) },
    { header: "Last sign-in", value: (u) => asDate(u.lastlogin) },
    ...auditExportColumns<User>(),
  ];

  const [editing, setEditing] = useState<{ user: User | null } | null>(null);
  const [viewing, setViewing] = useState<User | null>(null);
  const editUser = (u: User) => setEditing({ user: u });

  // Ticks clear when the page, search, sort or filters change; only rows still shown count (useTicked).
  const [selected, setSelected] = useTicked(query.data?.data ?? [], `${page}:${pageSize}:${search}:${status}:${role}:${emailStatusFilter}:${sort}`);
  const remove = useMutation({
    mutationFn: (users: User[]) => (users.length === 1 ? deleteUser(users[0].id) : deleteUsers(users.map((u) => u.id))),
    onSuccess: async (response) => {
      setSelected([]);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(response.message);
    },
  });

  const resendCode = useMutation({
    mutationFn: (u: User) => resendVerificationCode(u.id),
    onSuccess: (response) => toast.success(response.message),
  });

  const columns = [
    {
      field: "name",
      header: "Name",
      sortable: true,
      body: (u: User) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-(--brand-light) text-xs font-semibold text-(--brand-ink)">{initials(u.name)}</span>
          <div>
            <p className="font-medium text-(--text-primary)">{u.name}</p>
            <p className="text-xs text-(--text-muted)">{u.email}</p>
          </div>
        </div>
      ),
    },
    { field: "phone", header: "Phone", body: (u: User) => u.phone ?? "-" },
    { field: "role", header: "Role", body: (u: User) => <span className="text-sm">{u.role}</span> },
    { field: "status", header: "Status", sortable: true, body: (u: User) => <StatusTag status={u.status} raw /> },
    { field: "email_verified_at", header: "Email", sortable: true, body: (u: User) => <EmailTag user={u} /> },
    { field: "lastlogin", header: "Last sign-in", sortable: true, body: (u: User) => <span className="text-xs text-(--text-muted)">{dateTime(u.lastlogin)}</span> },
    ...auditColumns<User>(),
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Users" subtitle="Admins run the platform, Staff help them, and a Vendor runs their own shop. Status says whether an account may sign in; Email says whether they entered their sign-up code. Buyers never need an account." />
      <PrimeReactDataTable<User>
        data={query.data?.data ?? []}
        columns={columns}
        loading={query.isPending || query.isPlaceholderData}
        emptyMessage="No users match."
        fileName={`${APP_NAME} users`}
        exportAll={{ fetchPage: exportFetch, columns: exportColumns }}
        headerContent={
          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={(e) => { e.preventDefault(); setFilters({ search: searchInput.trim() }); }} className="flex">
              <InputText value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Name, email, phone or username" className="w-56 rounded-r-none! text-sm" />
              <Button type="submit" icon="pi pi-search" severity="secondary" outlined className="rounded-l-none!" aria-label="Search" />
            </form>
            <FiltersButton groups={filterGroups} values={filterValuesFrom(filterGroups, getParam)} onApply={setFilters} />
          </div>
        }
        pagination={{ total: query.data?.meta.total ?? 0, rows: pageSize, first, onPageChange: (e: DataTablePageEvent) => pushParams({ page: (e.page ?? 0) + 1, pageSize: e.rows }) }}
        sort={{ field: sortField, order: sortOrder, onSort: (e: DataTableSortEvent) => pushParams({ sort: columnSortToParam(e.sortField, e.sortOrder), page: DEFAULT_PAGE }) }}
        rowActions={
          canManage
            ? [
                viewAction<User>((u) => setViewing(u)),
                editAction<User>(editUser),
                {
                  key: "resend-code",
                  icon: <LuMailCheck />,
                  tooltip: "Resend code",
                  onClick: () => undefined,
                  hidden: (u) => !!u.email_verified_at || !u.email,
                  render: (u) => (
                    <Button
                      icon={<LuMailCheck />}
                      rounded
                      outlined
                      severity="help"
                      tooltip="Resend code"
                      tooltipOptions={{ position: "top" }}
                      aria-label="Resend code"
                      loading={resendCode.isPending && resendCode.variables?.id === u.id}
                      disabled={resendCode.isPending}
                      onClick={() =>
                        confirmAction({
                          header: `Email a new code to ${u.email}?`,
                          message: `${u.name} has not confirmed their email yet. The new code works for 10 minutes and replaces any earlier one.`,
                          acceptLabel: "Send code",
                          accept: () => resendCode.mutateAsync(u),
                        })
                      }
                    />
                  ),
                },
                {
                  key: "delete",
                  icon: <span className="pi pi-trash text-sm" />,
                  tooltip: "Delete",
                  severity: "danger",
                  hidden: (u) => u.id === me?.id,
                  onClick: (u) => confirmAction({ header: `Delete ${u.name}?`, message: "This cannot be undone. Someone named on other records cannot be deleted: deactivate them instead.", danger: true, acceptLabel: "Delete", accept: () => remove.mutateAsync([u]) }),
                },
              ]
            : []
        }
        selection={canManage ? { selected, onChange: setSelected, isSelectable: (u) => u.id !== me?.id } : undefined}
        toolbarActions={
          canManage
            ? [
                deleteSelectedAction<User>(() =>
                  confirmAction({
                    header: `Delete ${selected.length} accounts?`,
                    message: "This cannot be undone. If one of them is named on other records, none are deleted: deactivate them instead.",
                    danger: true,
                    acceptLabel: "Delete",
                    accept: () => remove.mutateAsync(selected),
                  }),
                ),
                createAction<User>(() => setEditing({ user: null })),
              ]
            : []
        }
      />

      <UserFormDialog user={editing?.user ?? null} visible={!!editing} onHide={() => setEditing(null)} />

      <RecordDetailsDialog
        header={viewing?.name ?? ""}
        visible={!!viewing}
        onHide={() => setViewing(null)}
        record={viewing}
        fields={
          viewing
            ? [
                { label: "Name", value: viewing.name },
                { label: "Role", value: viewing.role },
                { label: "Email", value: viewing.email || "None" },
                { label: "Phone", value: viewing.phone || "None" },
                { label: "Status", value: <StatusTag status={viewing.status} raw /> },
                { label: "Email confirmed", value: viewing.email_verified_at ? <span className="flex items-center gap-2"><EmailTag user={viewing} /> {dateTime(viewing.email_verified_at)}</span> : <EmailTag user={viewing} /> },
                { label: "Last sign-in", value: viewing.lastlogin ? dateTime(viewing.lastlogin) : "Never" },
              ]
            : []
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button label="Close" text onClick={() => setViewing(null)} />
            {canManage && viewing && <Button label="Edit" icon="pi pi-pencil" outlined onClick={() => { editUser(viewing); setViewing(null); }} />}
          </div>
        }
      />
    </div>
  );
}
