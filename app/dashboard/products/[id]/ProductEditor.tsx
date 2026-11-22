"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseFormSetError } from "react-hook-form";
import { PageHeader, StatusTag } from "@/components/dashboard/ui";
import ProductForm, { placeServerErrors, productFormValues, type ProductFormValues } from "@/components/dashboard/catalogue/ProductForm";
import ProductPhotosCard from "@/components/dashboard/catalogue/ProductPhotosCard";
import ProductStatusCard from "@/components/dashboard/catalogue/ProductStatusCard";
import ProductStockCard from "@/components/dashboard/catalogue/ProductStockCard";
import { useBreadcrumbTitle } from "@/contexts/BreadcrumbContext";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { usePermissions } from "@/hooks/usePermissions";
import { getProduct, updateProduct } from "@/services/catalogue/catalogue-service";
import { getShop } from "@/services/vendors/vendors-service";
import type { ProductPayload } from "@/services/types/catalogue";

const CATALOGUE_CLOSED = new Set(["Rejected", "Closed"]);

/**
 * One product: the form, its photos and its status. The shop's people edit it; reviewers see it and
 * can take it down (D35).
 */
export default function ProductEditor() {
  const { id } = useParams<{ id: string }>();
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const product = useQuery({ queryKey: ["product", id], queryFn: () => getProduct(id) });
  const shop = useQuery({ queryKey: ["shop", product.data?.shop_id], queryFn: () => getShop(product.data!.shop_id), enabled: !!product.data });
  useBreadcrumbTitle(product.data?.name);

  const save = useMutation({
    mutationFn: ({ payload }: { payload: ProductPayload; setError: UseFormSetError<ProductFormValues>; reset: (values: ProductFormValues) => void }) => updateProduct(id, payload),
    meta: { skipGlobalError: true },
    onSuccess: async (response, { reset }) => {
      queryClient.setQueryData(["product", id], response.data);
      // Variants may have changed: the stock card lists them.
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["products", response.data.shop_id] }), queryClient.invalidateQueries({ queryKey: ["stock", id] })]);
      // Re-seed from what was saved (dashboard-patterns §4): ids of new variants, a new address name.
      reset(productFormValues(response.data));
      toast.success(response.message);
    },
    onError: (error, { setError }) => {
      const rest = placeServerErrors(error, setError);
      if (rest.length) toast.error(rest.join(" "));
    },
  });

  if (product.isPending || shop.isPending || !product.data || !shop.data) {
    return <div className="h-64 animate-pulse rounded-2xl bg-(--bg-card)" role="status" aria-label="Loading" />;
  }

  const p = product.data;
  const editable = can("run shops") && !can("view vendors") && !CATALOGUE_CLOSED.has(shop.data.status);

  return (
    <div className="space-y-5">
      <PageHeader
        title={<span className="flex flex-wrap items-center gap-3">{p.name} <StatusTag status={p.blocked_at ? "Taken down" : p.status} raw /></span>}
        subtitle={<>{shop.data.name} · {p.category?.path} · <Link href={`/dashboard/shops/${p.shop_id}/products`} className="font-medium text-(--brand-ink) hover:underline">All products</Link></>}
      />
      {/* Keyed on the product: switching products seeds a fresh form. A save re-seeds from the response. */}
      <ProductForm
        key={p.id}
        shop={shop.data}
        product={p}
        readOnly={!editable}
        saving={save.isPending}
        onSubmit={(payload, setError, reset) => save.mutate({ payload, setError, reset })}
        aside={
          <>
            <ProductStatusCard product={p} shop={shop.data} editable={editable} moderator={can("manage vendors")} />
            <ProductStockCard productId={p.id} editable={editable} />
            <ProductPhotosCard product={p} editable={editable} />
          </>
        }
      />
    </div>
  );
}
