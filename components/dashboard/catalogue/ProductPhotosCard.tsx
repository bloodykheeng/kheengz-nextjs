"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import type { AxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/dashboard/ui";
import { confirmAction } from "@/components/dashboard/ConfirmAction";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { checkPhotos, IMAGE_LINK, PHOTO_ACCEPT, shrinkPhotos } from "@/lib/photos";
import { isStoredPhoto } from "@/lib/storedPhoto";
import type { ApiErrorBody } from "@/lib/validation";
import { addProductPhotoFromLink, deleteProductPhoto, reorderProductPhotos, setPhotoVariant, uploadProductPhotos } from "@/services/catalogue/catalogue-service";
import { LIMITS, type Product } from "@/services/types/catalogue";

const firstError = (e: AxiosError<ApiErrorBody>) => {
  const errors = e.response?.data?.errors;
  return (errors && Object.values(errors)[0]?.[0]) || e.response?.data?.message || "The photo did not upload. Try again.";
};

/**
 * A product's photos: uploaded from the phone (shrunk first, so mobile data is spared) or copied from a
 * pasted link. The first is the cover; arrows set the order; a photo can show one variant. The server
 * keeps them as WebP without the camera's metadata (kheengz-laravel ProductImage).
 */
export default function ProductPhotosCard({ product, editable }: { product: Product; editable: boolean }) {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const photos = product.photos ?? [];
  const room = LIMITS.photos - photos.length;
  const variants = (product.variants ?? []).filter((v) => v.label);

  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["product", product.id] }), queryClient.invalidateQueries({ queryKey: ["products", product.shop_id] })]);
  const upload = useMutation({
    mutationFn: async (files: File[]) => uploadProductPhotos(product.id, await shrinkPhotos(files)),
    meta: { skipGlobalError: true },
    onSuccess: async (response) => {
      await refresh();
      toast.success(response.message);
    },
    onError: (e: AxiosError<ApiErrorBody>) => setError(firstError(e)),
  });
  const fromLink = useMutation({
    mutationFn: () => addProductPhotoFromLink(product.id, link.trim()),
    meta: { skipGlobalError: true },
    onSuccess: async (response) => {
      await refresh();
      setLink("");
      toast.success(response.message);
    },
    onError: (e: AxiosError<ApiErrorBody>) => setError(firstError(e)),
  });
  const reorder = useMutation({ mutationFn: (ids: string[]) => reorderProductPhotos(product.id, ids), onSuccess: refresh });
  const tie = useMutation({ mutationFn: ({ id, variantId }: { id: string; variantId: string | null }) => setPhotoVariant(product.id, id, variantId), onSuccess: refresh });
  const remove = useMutation({
    mutationFn: (id: string) => deleteProductPhoto(product.id, id),
    onSuccess: async (response) => {
      await refresh();
      toast.success(response.message);
    },
  });

  const pick = (list: FileList | null) => {
    setError(null);
    const { photos: usable, problem } = checkPhotos(Array.from(list ?? []));
    if (problem) setError(problem);
    if (usable.length > room) return setError(`You can add ${room} more photo${room === 1 ? "" : "s"}.`);
    if (usable.length) upload.mutate(usable);
  };

  const move = (i: number, by: -1 | 1) => {
    const ids = photos.map((p) => p.id);
    [ids[i], ids[i + by]] = [ids[i + by], ids[i]];
    reorder.mutate(ids);
  };

  return (
    <Card title={`Photos (${photos.length} of ${LIMITS.photos})`}>
      <div className="space-y-4">
        {photos.length === 0 ? (
          <p className="text-sm text-(--text-muted)">Add at least one photo to put it on sale. Good light, plain background, the whole product in view.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {photos.map((p, i) => (
              <li key={p.id} className="space-y-1.5">
                <div className="relative aspect-square overflow-hidden rounded-xl border border-(--border-color) bg-white">
                  <Image src={p.thumb_url} alt={`${product.name}, photo ${i + 1}`} fill sizes="160px" className="object-contain" unoptimized={!isStoredPhoto(p.thumb_url)} />
                  {i === 0 && <span className="absolute left-1.5 top-1.5 rounded bg-(--brand) px-1.5 py-0.5 text-[10px] font-semibold text-white">Cover</span>}
                </div>
                {editable && (
                  <div className="flex items-center justify-between">
                    <Button type="button" text size="small" icon="pi pi-arrow-left" aria-label="Move earlier" disabled={i === 0 || reorder.isPending} onClick={() => move(i, -1)} />
                    <Button type="button" text size="small" icon="pi pi-arrow-right" aria-label="Move later" disabled={i === photos.length - 1 || reorder.isPending} onClick={() => move(i, 1)} />
                    <Button type="button" text size="small" severity="danger" icon="pi pi-trash" aria-label={`Remove photo ${i + 1}`}
                      onClick={() => confirmAction({ header: "Remove this photo?", message: "It cannot be brought back; upload it again if you need it.", danger: true, acceptLabel: "Remove", accept: () => remove.mutateAsync(p.id) })} />
                  </div>
                )}
                {editable && variants.length > 0 && (
                  <Dropdown value={p.product_variant_id} options={variants.map((v) => ({ label: v.label, value: v.id }))} onChange={(e) => tie.mutate({ id: p.id, variantId: e.value ?? null })}
                    placeholder="Every variant" showClear className="w-full text-xs" aria-label={`Which variant photo ${i + 1} shows`} />
                )}
              </li>
            ))}
          </ul>
        )}
        {editable && room > 0 && (
          <div className="space-y-3">
            <input ref={input} type="file" accept={PHOTO_ACCEPT} multiple hidden onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
            <Button type="button" icon="pi pi-upload" label="Upload photos" className="w-full" outlined loading={upload.isPending} onClick={() => input.current?.click()} />
            <form className="flex gap-2" noValidate onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              if (!IMAGE_LINK.test(link.trim())) return setError("Paste the full image link, starting with https://");
              fromLink.mutate();
            }}>
              <InputText value={link} onChange={(e) => setLink(e.target.value)} placeholder="Or paste an image link" aria-label="Image link" className="min-w-0 flex-1 text-sm" />
              <Button type="submit" outlined icon="pi pi-link" aria-label="Add from link" loading={fromLink.isPending} />
            </form>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </div>
    </Card>
  );
}
