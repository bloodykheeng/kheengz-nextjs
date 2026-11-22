"use client";

import React, { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Field } from "@/components/dashboard/ui";
import CategoryPicker, { branchOf } from "@/components/dashboard/catalogue/CategoryPicker";
import { useResetOnOpen } from "@/hooks/useResetOnOpen";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { applyServerErrors, requiredText } from "@/lib/validation";
import { createCategory, updateCategory } from "@/services/catalogue/catalogue-service";
import { LIMITS, type Category } from "@/services/types/catalogue";

/** Icons a top category can show (PrimeIcons), with the words people search for. */
export const CATEGORY_ICONS = [
  { value: "pi-home", label: "Home" },
  { value: "pi-wrench", label: "Tools" },
  { value: "pi-shopping-cart", label: "Groceries" },
  { value: "pi-star", label: "Fashion" },
  { value: "pi-mobile", label: "Phones" },
  { value: "pi-desktop", label: "Computers" },
  { value: "pi-heart", label: "Babies" },
  { value: "pi-book", label: "Books" },
  { value: "pi-car", label: "Cars" },
  { value: "pi-gift", label: "Gifts" },
  { value: "pi-sun", label: "Garden" },
  { value: "pi-bolt", label: "Electrical" },
  { value: "pi-box", label: "General" },
  { value: "pi-palette", label: "Art" },
  { value: "pi-briefcase", label: "Office" },
];

const schema = z.object({
  name: requiredText("Enter the category's name.", 2).max(80),
  parent_id: z.string().nullable(),
  icon: z.string().nullable(),
});
type Values = z.infer<typeof schema>;

/**
 * Add a category (at the top, or inside `parent`) or edit one: its name, where it sits, its icon. The
 * picker greys out places it cannot go: inside itself, or deeper than four levels.
 */
export default function CategoryDialog({ visible, onHide, categories, category, parent }: {
  visible: boolean;
  onHide: () => void;
  categories: Category[];
  category: Category | null;
  parent: Category | null;
}) {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, reset, setError, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) });

  useResetOnOpen(visible, category?.id ?? parent?.id ?? "new", () => setFormError(null));
  useEffect(() => {
    if (visible) reset({ name: category?.name ?? "", parent_id: category ? category.parent_id : (parent?.id ?? null), icon: category?.icon ?? null });
  }, [visible, category, parent, reset]);

  // Moving a category with children below it: the deepest of them must stay within the limit.
  const own = category ? branchOf(categories, category.id) : new Set<string>();
  const height = category ? Math.max(...categories.filter((c) => own.has(c.id)).map((c) => c.depth)) - category.depth + 1 : 1;

  const save = useMutation({
    mutationFn: (v: Values) => (category ? updateCategory(category.id, v) : createCategory(v)),
    meta: { skipGlobalError: true },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(response.message);
      onHide();
    },
    onError: (error) => setFormError(applyServerErrors(error, setError, ["name", "parent_id", "icon"])),
  });

  return (
    <Dialog header={category ? `Edit ${category.name}` : parent ? `Add inside ${parent.name}` : "Add a category"} visible={visible} onHide={onHide} style={{ width: "min(32rem, 95vw)" }} closable={!save.isPending}>
      <form className="space-y-4" noValidate onSubmit={handleSubmit((v) => { setFormError(null); save.mutate(v); })}>
        <Field label="Name" required error={errors.name?.message} hint="What buyers look for, like Basins or Iron sheets.">
          <Controller control={control} name="name" render={({ field }) => <InputText {...field} className="w-full" invalid={!!errors.name} autoFocus />} />
        </Field>
        <Field label="Inside" error={errors.parent_id?.message} hint="Leave empty for a top category.">
          <Controller control={control} name="parent_id" render={({ field }) => (
            <CategoryPicker
              categories={categories}
              value={field.value}
              onChange={field.onChange}
              placeholder="At the top"
              showClear
              disabled={(c) => own.has(c.id) || c.depth + height > LIMITS.categoryDepth}
            />
          )} />
        </Field>
        <Field label="Icon" error={errors.icon?.message} hint="Shown on the marketplace menu for top categories.">
          <Controller control={control} name="icon" render={({ field }) => (
            <Dropdown
              value={field.value}
              options={CATEGORY_ICONS}
              onChange={(e) => field.onChange(e.value ?? null)}
              placeholder="No icon"
              showClear
              filter
              className="w-full"
              itemTemplate={(o: { value: string; label: string }) => <span className="flex items-center gap-2"><span className={`pi ${o.value}`} aria-hidden /> {o.label}</span>}
              valueTemplate={(o: { value: string; label: string } | null, props) => (o ? <span className="flex items-center gap-2"><span className={`pi ${o.value}`} aria-hidden /> {o.label}</span> : <span>{props.placeholder}</span>)}
            />
          )} />
        </Field>
        {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{formError}</p>}
        <div className="flex justify-end gap-2 border-t border-(--border-color) pt-4">
          <Button type="button" text label="Cancel" onClick={onHide} disabled={save.isPending} />
          <Button type="submit" icon="pi pi-check" label="Save" loading={save.isPending} />
        </div>
      </form>
    </Dialog>
  );
}
