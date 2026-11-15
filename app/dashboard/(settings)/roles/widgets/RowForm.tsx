"use client";

import React, { useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TabView, TabPanel } from "primereact/tabview";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { syncPermissionsToRoles } from "@/services/settings/roles/roles-service";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { RolesSubmissionSchema, type Role } from "./types";

interface RowFormProps {
  rolesData: Role[];
}

/** How many permissions in `role` differ from `base`. 0 means the tab matches the server. */
function countChanges(role?: Role, base?: Role): number {
  if (!role || !base) return 0;
  const saved = new Map(base.permissions.map((p) => [p.name, p.value]));

  return role.permissions.reduce(
    (n, perm) => (saved.get(perm.name) !== perm.value ? n + 1 : n),
    0
  );
}

/**
 * One tab per role, one checkbox per permission. Each tab submits only its own
 * role: `syncPermissions` replaces the full permission set for every role in the
 * payload, so sending all tabs at once would overwrite roles the user never
 * opened with whatever was last fetched.
 *
 * Because a tab can only ever submit itself, an edit left behind on a tab you are
 * not looking at can never be saved from where you are. You have to come back and
 * press that tab's own button. So leaving a tab with unsaved changes asks first and
 * then discards them, and every tab you open states the database, not a forgotten
 * draft. A screen reading "0 of 26 permissions granted" has to mean the role really
 * has none; on a permissions editor that ambiguity is the dangerous kind.
 */
export default function RowForm({ rolesData }: RowFormProps) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<Role[] | null>(null);
  /** Tab we are trying to move to, held while the discard prompt is up. */
  const [pendingTab, setPendingTab] = useState<number | null>(null);

  /**
   * Where the server stands, per role: what "unsaved changes" is measured against
   * and what Reset/Discard restores. Seeded from the first fetch and moved forward
   * on a successful sync. It is deliberately NOT re-seeded from later refetches:
   * `defaultValues` is read once at mount, so a background refetch cannot reach the
   * form anyway, and adopting it here would wipe an edit in progress. The cost is
   * that a change made by another admin while this page sits open shows up only
   * after a reload, which is acceptable on a System-Admin-only screen.
   */
  const [baseline, setBaseline] = useState<Role[]>(rolesData);

  const queryClient = useQueryClient();
  const toast = usePrimeReactToast();

  const { control, handleSubmit } = useForm<{ roles: Role[] }>({
    resolver: zodResolver(RolesSubmissionSchema),
    defaultValues: { roles: rolesData },
  });

  const { fields, update } = useFieldArray({ control, name: "roles" });

  const changeCounts = useMemo(
    () => fields.map((field, i) => countChanges(field, baseline[i])),
    [fields, baseline]
  );

  const mutation = useMutation({
    mutationFn: syncPermissionsToRoles,
    onSuccess: async (_res, variables) => {
      // Advance the baseline to exactly what we sent. The server now holds it, so
      // the tab goes clean straight away. Waiting for the refetch would never work:
      // the form ignores new `defaultValues` after mount, so without this the tab
      // stays permanently "unsaved" and Sync never disables.
      setBaseline((prev) =>
        prev.map((base) => variables.roles.find((r) => r.role === base.role) ?? base)
      );
      await queryClient.invalidateQueries({ queryKey: ["roles-with-permissions"] });
      toast.success("Permissions synced", "The role now has the selected permissions.");
    },
  });

  const handlePermissionChange = (
    roleIndex: number,
    permIndex: number,
    checked: boolean
  ) => {
    update(roleIndex, {
      ...fields[roleIndex],
      permissions: fields[roleIndex].permissions.map((perm, i) =>
        i === permIndex ? { ...perm, value: checked } : perm
      ),
    });
  };

  const toggleAll = (roleIndex: number, value: boolean) => {
    update(roleIndex, {
      ...fields[roleIndex],
      permissions: fields[roleIndex].permissions.map((perm) => ({ ...perm, value })),
    });
  };

  /** Throw away this tab's edits and put the server's values back. */
  const resetRole = (roleIndex: number) => {
    const base = baseline[roleIndex];
    if (base) update(roleIndex, base);
  };

  // Tab switching goes through here so a dirty tab gets a prompt instead of
  // silently carrying its draft to the next visit.
  const requestTabChange = (index: number) => {
    if (index === selectedTab) return;

    if ((changeCounts[selectedTab] ?? 0) > 0) {
      setPendingTab(index);

      return;
    }

    setSelectedTab(index);
  };

  const discardAndMove = () => {
    resetRole(selectedTab);
    if (pendingTab !== null) setSelectedTab(pendingTab);
    setPendingTab(null);
  };

  const handleTabSubmit = (role: Role) => {
    setPendingSubmit([{ role: role.role, permissions: role.permissions }]);
    setOpenConfirmDialog(true);
  };

  const handleConfirmSubmit = () => {
    if (pendingSubmit) mutation.mutate({ roles: pendingSubmit });
    setOpenConfirmDialog(false);
  };

  const leavingRole = fields[selectedTab]?.role;
  const leavingChanges = changeCounts[selectedTab] ?? 0;

  return (
    <>
      <TabView
        activeIndex={selectedTab}
        onTabChange={(e) => requestTabChange(e.index)}
        className="w-full"
      >
        {fields.map((field, roleIndex) => {
          const granted = field.permissions.filter((p) => p.value).length;
          const total = field.permissions.length;
          const changes = changeCounts[roleIndex] ?? 0;

          return (
            <TabPanel
              key={field.role}
              header={
                <span className="flex items-center gap-1.5">
                  {field.role}
                  {changes > 0 && (
                    <span
                      title={`${changes} unsaved change${changes === 1 ? "" : "s"}`}
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--color-warning)"
                    />
                  )}
                </span>
              }
              pt={{ headerAction: { className: "text-sm! font-medium!" } }}
            >
              <form onSubmit={handleSubmit(() => handleTabSubmit(fields[roleIndex]))}>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-(--border-color) pb-3">
                  <p className="text-sm text-(--text-muted)">
                    <span className="font-semibold text-(--text-primary)">{granted}</span>{" "}
                    of {total} permissions granted
                    {changes > 0 && (
                      <>
                        {" · "}
                        <span className="font-medium text-(--color-warning)">
                          {changes} unsaved
                        </span>
                      </>
                    )}
                  </p>
                  <div className="flex gap-2">
                    {changes > 0 && (
                      <Button
                        type="button"
                        label="Reset"
                        icon="pi pi-undo"
                        size="small"
                        severity="secondary"
                        text
                        onClick={() => resetRole(roleIndex)}
                      />
                    )}
                    <Button
                      type="button"
                      label="Select all"
                      icon="pi pi-check-square"
                      size="small"
                      severity="secondary"
                      outlined
                      onClick={() => toggleAll(roleIndex, true)}
                    />
                    <Button
                      type="button"
                      label="Clear all"
                      icon="pi pi-stop"
                      size="small"
                      severity="secondary"
                      outlined
                      onClick={() => toggleAll(roleIndex, false)}
                    />
                  </div>
                </div>

                {total === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-(--text-muted)">
                    <span className="pi pi-inbox text-3xl opacity-40" />
                    <p className="text-sm">
                      No permissions defined. Add them to RolesAndPermissionsSeeder and
                      re-seed.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 p-2 pt-4 sm:grid-cols-2 lg:grid-cols-3">
                    {field.permissions.map((permission, permIndex) => (
                      <label
                        key={`${permission.name}-${permIndex}`}
                        htmlFor={`perm-${roleIndex}-${permIndex}`}
                        className="flex cursor-pointer select-none items-center gap-2 rounded-lg border border-(--border-color) px-3 py-2 transition-colors hover:bg-(--bg-page)"
                      >
                        <Checkbox
                          inputId={`perm-${roleIndex}-${permIndex}`}
                          checked={permission.value}
                          onChange={(e) =>
                            handlePermissionChange(roleIndex, permIndex, !!e.checked)
                          }
                        />
                        <span className="text-sm capitalize text-(--text-secondary)">
                          {permission.name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                <div className="mt-6 flex flex-col items-center gap-1.5">
                  <Button
                    type="submit"
                    label={
                      mutation.isPending
                        ? `Syncing ${field.role} permissions…`
                        : `Sync ${field.role} permissions`
                    }
                    icon={mutation.isPending ? "pi pi-spin pi-spinner" : "pi pi-save"}
                    disabled={mutation.isPending || total === 0 || changes === 0}
                  />
                  {changes === 0 && total > 0 && (
                    <span className="text-xs text-(--text-muted)">
                      Nothing to sync. This matches the saved permissions.
                    </span>
                  )}
                </div>
              </form>
            </TabPanel>
          );
        })}
      </TabView>

      <Dialog maximizable
        header="Confirm submission"
        visible={openConfirmDialog}
        onHide={() => setOpenConfirmDialog(false)}
        style={{ width: "min(22rem, 95vw)" }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Yes, sync"
              icon="pi pi-check"
              onClick={handleConfirmSubmit}
              disabled={mutation.isPending}
            />
            <Button
              label="Cancel"
              severity="secondary"
              text
              onClick={() => setOpenConfirmDialog(false)}
            />
          </div>
        }
      >
        <p className="text-sm text-(--text-secondary)">
          This replaces the full permission set for{" "}
          <span className="font-semibold">{pendingSubmit?.[0]?.role}</span>. Continue?
        </p>
      </Dialog>

      <Dialog maximizable
        header="Discard unsaved changes?"
        visible={pendingTab !== null}
        onHide={() => setPendingTab(null)}
        style={{ width: "min(24rem, 95vw)" }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Discard"
              icon="pi pi-trash"
              severity="danger"
              onClick={discardAndMove}
            />
            <Button
              label="Stay"
              severity="secondary"
              text
              onClick={() => setPendingTab(null)}
            />
          </div>
        }
      >
        <p className="text-sm text-(--text-secondary)">
          <span className="font-semibold">{leavingRole}</span> has {leavingChanges}{" "}
          unsaved permission change{leavingChanges === 1 ? "" : "s"}. Leaving this tab
          discards {leavingChanges === 1 ? "it" : "them"}. Each role is synced from its
          own tab.
        </p>
      </Dialog>
    </>
  );
}
