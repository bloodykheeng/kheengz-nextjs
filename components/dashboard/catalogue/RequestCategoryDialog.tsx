"use client";

import React, { useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import type { AxiosError } from "axios";
import { useMutation } from "@tanstack/react-query";
import { Field } from "@/components/dashboard/ui";
import CategoryPicker from "@/components/dashboard/catalogue/CategoryPicker";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { useResetOnOpen } from "@/hooks/useResetOnOpen";
import type { ApiErrorBody } from "@/lib/validation";
import { requestCategory } from "@/services/catalogue/catalogue-service";
import type { Category } from "@/services/types/catalogue";

/**
 * Ask Kheengz for a category the tree lacks (D32), from the product form. Until it is added the
 * product goes in the nearest category; the vendor is told when theirs exists.
 */
export default function RequestCategoryDialog({ shopId, categories, visible, onHide }: { shopId: string; categories: Category[]; visible: boolean; onHide: () => void }) {
  const toast = usePrimeReactToast();
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  useResetOnOpen(visible, shopId, () => {
    setName("");
    setParentId(null);
    setNote("");
    setError(null);
  });

  const ask = useMutation({
    mutationFn: () => requestCategory(shopId, { name: name.trim(), parent_id: parentId, note: note.trim() || null }),
    meta: { skipGlobalError: true },
    onSuccess: (response) => {
      toast.success(response.message);
      onHide();
    },
    onError: (e: AxiosError<ApiErrorBody>) => {
      const errors = e.response?.data?.errors;
      setError((errors && Object.values(errors)[0]?.[0]) || e.response?.data?.message || "That did not send. Try again.");
    },
  });

  return (
    <Dialog header="Ask for a category" visible={visible} onHide={onHide} style={{ width: "min(30rem, 95vw)" }} closable={!ask.isPending}>
      <form className="space-y-4" noValidate onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (name.trim().length < 2) return setError("Say what the category should be called.");
        ask.mutate();
      }}>
        <p className="text-sm text-(--text-secondary)">We usually add it the same day and tell you. Meanwhile, put the product in the nearest category.</p>
        <Field label="Name" required>
          <InputText value={name} onChange={(e) => setName(e.target.value)} className="w-full" placeholder="Water filters" autoFocus />
        </Field>
        <Field label="Where it belongs" hint="Optional: the category it would sit inside.">
          <CategoryPicker categories={categories} value={parentId} onChange={setParentId} placeholder="Not sure" showClear />
        </Field>
        <Field label="What you sell that needs it" hint="Optional, helps us place it.">
          <InputText value={note} onChange={(e) => setNote(e.target.value)} className="w-full" maxLength={500} placeholder="Ceramic candle water filters, 10 and 20 litres" />
        </Field>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-(--border-color) pt-4">
          <Button type="button" text label="Cancel" onClick={onHide} disabled={ask.isPending} />
          <Button type="submit" icon="pi pi-send" label="Ask" loading={ask.isPending} />
        </div>
      </form>
    </Dialog>
  );
}
