"use client";

import React, { useState } from "react";
import { Button } from "primereact/button";
import type { AxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, StatusTag } from "@/components/dashboard/ui";
import { confirmAction } from "@/components/dashboard/ConfirmAction";
import { ReasonDialog } from "@/components/dashboard/vendors/PayoutDestinationsCard";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { useAppRouter } from "@/hooks/useAppRouter";
import { dateTime } from "@/lib/format";
import type { ApiErrorBody } from "@/lib/validation";
import { actOnProduct, blockProduct, deleteProduct, type ProductAction } from "@/services/catalogue/catalogue-service";
import type { Product } from "@/services/types/catalogue";
import type { Shop } from "@/services/types/kheengz";

/**
 * Where a product stands and what can be done: put it on sale (the API says what is missing, each
 * point listed here), hide it, delete a draft never on sale. Kheengz takes a product down with a
 * reason, or allows it again (D35, D36).
 */
export default function ProductStatusCard({ product, shop, editable, moderator }: { product: Product; shop: Shop; editable: boolean; moderator: boolean }) {
  const toast = usePrimeReactToast();
  const router = useAppRouter();
  const queryClient = useQueryClient();
  const [problems, setProblems] = useState<string[]>([]);
  const [blocking, setBlocking] = useState(false);
  const blocked = !!product.blocked_at;

  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["product", product.id] }), queryClient.invalidateQueries({ queryKey: ["products", product.shop_id] })]);
  const act = useMutation({
    mutationFn: (action: ProductAction) => actOnProduct(product.id, action),
    meta: { skipGlobalError: true },
    onSuccess: async (response) => {
      setProblems([]);
      await refresh();
      toast.success(response.message);
    },
    onError: (e: AxiosError<ApiErrorBody>) => {
      const errors = e.response?.data?.errors;
      setProblems(errors ? Object.values(errors).map((m) => m[0]) : [e.response?.data?.message ?? "That did not work. Try again."]);
    },
  });
  const block = useMutation({
    mutationFn: (reason: string) => blockProduct(product.id, reason),
    onSuccess: async (response) => {
      await refresh();
      toast.success(response.message);
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteProduct(product.id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["products", product.shop_id] });
      toast.success(response.message);
      router.push(`/dashboard/shops/${product.shop_id}/products`);
    },
  });

  const selling = shop.status === "Active";
  const status = blocked ? "Taken down" : product.status;

  return (
    <Card title="Status" actions={<StatusTag status={status} raw />}>
      <div className="space-y-3">
        {blocked ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
            Kheengz took this product down: {product.blocked_reason} {editable && "Fix it, then ask support to allow it again."}
          </p>
        ) : (
          <p className="text-sm text-(--text-secondary)">
            {product.status === "Draft" && "Not on sale yet. Put it on sale once it has photos and its details."}
            {product.status === "Active" && (selling ? "On sale: buyers can find it." : `Ready. Buyers see it once ${shop.name} is open.`)}
            {product.status === "Hidden" && "Hidden from buyers. Put it back on sale whenever you like."}
          </p>
        )}
        {product.published_at && <p className="text-xs text-(--text-muted)">First on sale {dateTime(product.published_at)}</p>}
        {problems.length > 0 && (
          <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            <p className="font-medium">Before it can go on sale:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {editable && !blocked && product.status !== "Active" && (
            <Button type="button" icon="pi pi-check-circle" severity="success" label="Put on sale" loading={act.isPending && act.variables === "publish"} onClick={() => act.mutate("publish")} />
          )}
          {editable && product.status === "Active" && (
            <Button type="button" icon="pi pi-eye-slash" outlined label="Hide" onClick={() => confirmAction({ header: `Hide ${product.name}?`, message: "Buyers stop seeing it. Put it back on sale any time.", acceptLabel: "Hide", accept: () => act.mutateAsync("hide") })} />
          )}
          {editable && product.status === "Draft" && !product.published_at && (
            <Button type="button" icon="pi pi-trash" text severity="danger" label="Delete draft" onClick={() => confirmAction({ header: `Delete ${product.name}?`, message: "The draft and its photos go. This cannot be undone.", danger: true, acceptLabel: "Delete", accept: () => remove.mutateAsync() })} />
          )}
          {moderator && !blocked && (
            <Button type="button" icon="pi pi-ban" text severity="danger" label="Take down" onClick={() => setBlocking(true)} />
          )}
          {moderator && blocked && (
            <Button type="button" icon="pi pi-replay" outlined label="Allow again" onClick={() => confirmAction({ header: `Allow ${product.name} again?`, message: "The shop can put it back on sale itself.", acceptLabel: "Allow again", accept: () => act.mutateAsync("unblock") })} />
          )}
        </div>
      </div>
      <ReasonDialog visible={blocking} header={`Take down ${product.name}?`} prompt="The shop reads this. Say what is wrong and what to fix." acceptLabel="Take down"
        onHide={() => setBlocking(false)} onSubmit={(reason) => block.mutateAsync(reason)} />
    </Card>
  );
}
