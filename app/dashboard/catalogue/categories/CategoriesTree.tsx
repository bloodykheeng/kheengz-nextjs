"use client";

import React, { useMemo, useState } from "react";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, EmptyState, PageHeader } from "@/components/dashboard/ui";
import { confirmAction } from "@/components/dashboard/ConfirmAction";
import CategoryDialog from "@/components/dashboard/catalogue/CategoryDialog";
import CategoryAttributesDialog from "@/components/dashboard/catalogue/CategoryAttributesDialog";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { plural } from "@/lib/plural";
import { deleteCategory, getCategories, updateCategory } from "@/services/catalogue/catalogue-service";
import { LIMITS, type Category } from "@/services/types/catalogue";

/**
 * The marketplace's category tree (D32), kept by the Admin. Every product sits in one category; a
 * category's attributes (and its parents') are what buyers filter by. A category in use is turned off,
 * never deleted, so no product loses its place. Not paged: the tree is the menu, read whole.
 */
export default function CategoriesTree() {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const tree = useQuery({ queryKey: ["categories"], queryFn: () => getCategories() });
  const categories = useMemo(() => tree.data ?? [], [tree.data]);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ category: Category | null; parent: Category | null } | null>(null);
  const [attributesOf, setAttributesOf] = useState<Category | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["categories"] });
  const toggle = useMutation({
    mutationFn: (c: Category) => updateCategory(c.id, { is_active: !c.is_active }),
    onSuccess: async (response) => {
      await refresh();
      toast.success(response.data.is_active ? `${response.data.name} is on.` : `${response.data.name} is off. Vendors can no longer choose it.`);
    },
  });
  const remove = useMutation({
    mutationFn: (c: Category) => deleteCategory(c.id),
    onSuccess: async (response) => {
      await refresh();
      toast.success(response.message);
    },
  });

  // Searching shows every match with the categories above it; otherwise collapsed branches hide.
  const term = search.trim().toLowerCase();
  const visible = useMemo(() => {
    if (term) {
      const keep = new Set<string>();
      const byId = new Map(categories.map((c) => [c.id, c]));
      for (const c of categories) {
        if (!c.path.toLowerCase().includes(term)) continue;
        for (let node: Category | undefined = c; node; node = node.parent_id ? byId.get(node.parent_id) : undefined) keep.add(node.id);
      }
      return categories.filter((c) => keep.has(c.id));
    }
    const hidden = new Set<string>();
    return categories.filter((c) => {
      if (c.parent_id && (hidden.has(c.parent_id) || collapsed.has(c.parent_id))) {
        hidden.add(c.id);
        return false;
      }
      return true;
    });
  }, [categories, collapsed, term]);

  const askDelete = (c: Category) => {
    const used = (c.products_count ?? 0) > 0 || (c.children_count ?? 0) > 0;
    confirmAction(used
      ? { header: `${c.name} cannot be deleted`, message: (c.children_count ?? 0) > 0 ? "Move or delete the categories inside it first." : `${plural(c.products_count ?? 0, "product")} ${c.products_count === 1 ? "is" : "are"} in it. Turn it off instead: vendors stop choosing it, and the products keep their place until moved.`, blocked: true, accept: async () => undefined }
      : { header: `Delete ${c.name}?`, message: "It is empty and nothing points at it. This cannot be undone.", danger: true, acceptLabel: "Delete", accept: () => remove.mutateAsync(c) });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Categories"
        subtitle="The marketplace's own tree. Buyers browse and filter by it across every shop; shops group their products their own way with sections."
        actions={<Button icon="pi pi-plus" label="Add category" onClick={() => setEditing({ category: null, parent: null })} />}
      />
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--border-color) px-5 py-3">
          <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search categories, like basins" className="w-full text-sm sm:w-72" aria-label="Search categories" />
          <span className="text-xs text-(--text-muted)">{plural(categories.length, "category", "categories")}</span>
        </div>
        {tree.isPending ? (
          <div className="space-y-2 p-5" role="status" aria-label="Loading">
            {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-(--border-color)/50" />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="p-5">
            <EmptyState icon="pi-sitemap" title={term ? "No category matches" : "No categories yet"} body={term ? "Try another word." : "Add the first top category, like Household & kitchen."} />
          </div>
        ) : (
          <ul role="tree" aria-label="Categories" className="divide-y divide-(--border-color)">
            {visible.map((c) => {
              const hasChildren = (c.children_count ?? 0) > 0;
              const open = !collapsed.has(c.id) || !!term;
              return (
                <li key={c.id} role="treeitem" aria-level={c.depth} aria-expanded={hasChildren ? open : undefined} aria-selected={false}
                  className={`flex flex-wrap items-center gap-2 px-3 py-2 sm:flex-nowrap ${c.is_active ? "" : "opacity-60"}`}>
                  <span className="flex min-w-0 flex-1 items-center gap-1.5" style={{ paddingLeft: `${(c.depth - 1) * 1.25}rem` }}>
                    {hasChildren ? (
                      <Button type="button" text rounded size="small" className="h-7! w-7! shrink-0" icon={`pi ${open ? "pi-chevron-down" : "pi-chevron-right"}`}
                        aria-label={open ? `Fold ${c.name}` : `Unfold ${c.name}`}
                        onClick={() => setCollapsed((s) => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })} />
                    ) : <span className="w-7 shrink-0" aria-hidden />}
                    {c.icon && <span className={`pi ${c.icon} text-sm text-(--text-muted)`} aria-hidden />}
                    <span className="min-w-0">
                      <span className={`block truncate text-sm ${c.depth === 1 ? "font-semibold" : "font-medium"} text-(--text-primary)`}>{c.name}</span>
                      <span className="block text-xs text-(--text-muted)">
                        {plural(c.products_count ?? 0, "product")}{c.is_active ? "" : " · off"}
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-wrap justify-end gap-0.5">
                    {c.depth < LIMITS.categoryDepth && (
                      <Button type="button" text size="small" icon="pi pi-plus" label="Inside" onClick={() => setEditing({ category: null, parent: c })} aria-label={`Add a category inside ${c.name}`} />
                    )}
                    <Button type="button" text size="small" icon="pi pi-sliders-h" label="Attributes" onClick={() => setAttributesOf(c)} aria-label={`Attributes of ${c.name}`} />
                    <Button type="button" text size="small" icon="pi pi-pencil" aria-label={`Edit ${c.name}`} onClick={() => setEditing({ category: c, parent: null })} />
                    <Button type="button" text size="small" icon={c.is_active ? "pi pi-eye-slash" : "pi pi-eye"} aria-label={c.is_active ? `Turn ${c.name} off` : `Turn ${c.name} on`}
                      loading={toggle.isPending && toggle.variables?.id === c.id}
                      onClick={() => confirmAction({
                        header: c.is_active ? `Turn ${c.name} off?` : `Turn ${c.name} on?`,
                        message: c.is_active ? "Vendors can no longer choose it, and it leaves the marketplace menu with everything inside it. Products in it keep their place until moved." : "Vendors can choose it again.",
                        acceptLabel: c.is_active ? "Turn off" : "Turn on",
                        accept: () => toggle.mutateAsync(c),
                      })} />
                    <Button type="button" text size="small" severity="danger" icon="pi pi-trash" aria-label={`Delete ${c.name}`} onClick={() => askDelete(c)} />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <CategoryDialog visible={!!editing} onHide={() => setEditing(null)} categories={categories} category={editing?.category ?? null} parent={editing?.parent ?? null} />
      <CategoryAttributesDialog category={attributesOf} onHide={() => setAttributesOf(null)} />
    </div>
  );
}
