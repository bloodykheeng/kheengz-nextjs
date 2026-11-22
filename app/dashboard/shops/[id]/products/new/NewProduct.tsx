"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseFormSetError } from "react-hook-form";
import { PageHeader } from "@/components/dashboard/ui";
import ProductForm, { placeServerErrors, type ProductFormValues } from "@/components/dashboard/catalogue/ProductForm";
import { useBreadcrumbTitle } from "@/contexts/BreadcrumbContext";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { useAppRouter } from "@/hooks/useAppRouter";
import { createProduct } from "@/services/catalogue/catalogue-service";
import { getShop } from "@/services/vendors/vendors-service";
import type { ProductPayload } from "@/services/types/catalogue";
import { ProductRecordSkeleton } from "@/components/dashboard/RecordSkeleton";
import { confirmSubmit } from "@/components/dashboard/ConfirmAction";

/** A new product, saved as a draft; then its own page opens for the photos and putting it on sale. */
export default function NewProduct() {
  const { id } = useParams<{ id: string }>();
  const toast = usePrimeReactToast();
  const router = useAppRouter();
  const queryClient = useQueryClient();
  const shop = useQuery({ queryKey: ["shop", id], queryFn: () => getShop(id) });
  // The address's id is the shop's: the breadcrumb names it.
  useBreadcrumbTitle(shop.data?.name);

  const save = useMutation({
    mutationFn: ({ payload }: { payload: ProductPayload; setError: UseFormSetError<ProductFormValues> }) => createProduct(id, payload),
    meta: { skipGlobalError: true },
    onSuccess: async (response) => {
      // Go first, let the list catch up (dashboard-patterns §12).
      queryClient.invalidateQueries({ queryKey: ["products", id], refetchType: "none" });
      queryClient.setQueryData(["product", response.data.id], response.data);
      toast.success(response.message);
      router.replace(`/dashboard/products/${response.data.id}`);
    },
    onError: (error, { setError }) => {
      const rest = placeServerErrors(error, setError);
      if (rest.length) toast.error(rest.join(" "));
    },
  });

  if (shop.isPending || !shop.data) return <ProductRecordSkeleton />;

  return (
    <div className="space-y-5">
      <PageHeader title="New product" subtitle={`For ${shop.data.name}. Save it as a draft, then add photos and put it on sale.`} />
      <ProductForm shop={shop.data} product={null} saving={save.isPending} onSubmit={(payload, setError) => confirmSubmit("this product", () => save.mutateAsync({ payload, setError }))} />
    </div>
  );
}
