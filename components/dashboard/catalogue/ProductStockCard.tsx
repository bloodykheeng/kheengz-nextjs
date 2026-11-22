"use client";

import React, { useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Paginator } from "primereact/paginator";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/dashboard/ui";
import RecordStockDialog from "@/components/dashboard/catalogue/RecordStockDialog";
import { dateTime } from "@/lib/format";
import { getStockCard, getStockMovements } from "@/services/catalogue/catalogue-service";
import type { StockMovement } from "@/services/types/catalogue";

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/**
 * A product's stock (docs/stock.md): what is free of each counted variant, per location when there are
 * several, with what orders hold. The shop's people record changes; everyone who sees it reads the history.
 */
export default function ProductStockCard({ productId, editable }: { productId: string; editable: boolean }) {
  const card = useQuery({ queryKey: ["stock", productId], queryFn: () => getStockCard(productId) });
  const [recording, setRecording] = useState(false);
  const [history, setHistory] = useState(false);
  const locations = card.data?.locations ?? [];
  const variants = card.data?.variants ?? [];
  const several = locations.length > 1;

  return (
    <Card title="Stock" actions={
      <span className="flex gap-1">
        <Button type="button" size="small" text icon="pi pi-history" label="History" onClick={() => setHistory(true)} />
        {editable && <Button type="button" size="small" icon="pi pi-plus" label="Record" onClick={() => setRecording(true)} />}
      </span>
    }>
      {card.isPending ? (
        <div className="h-20 animate-pulse rounded-lg bg-(--border-color)/40" role="status" aria-label="Loading" />
      ) : (
        <ul className="divide-y divide-(--border-color)">
          {variants.map((v) => {
            const low = v.track_stock && v.low_stock_at !== null && v.available > 0 && v.available <= v.low_stock_at;
            const out = v.track_stock && v.available <= 0;
            return (
              <li key={v.id} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-medium text-(--text-primary)">{v.label || "In stock"}</span>
                  {v.track_stock ? (
                    <span className={`shrink-0 text-sm font-semibold ${out ? "text-red-600" : low ? "text-amber-600" : "text-(--text-primary)"}`}>
                      {out ? "None free" : `${v.available} ${v.available === 1 ? v.unit.name : v.unit.plural}`}
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs text-(--text-muted)">Not counted</span>
                  )}
                </div>
                {v.track_stock && (v.reserved > 0 || several) && (
                  <p className="mt-0.5 text-xs text-(--text-muted)">
                    {several && v.levels.map((l) => `${locations.find((x) => x.id === l.location_id)?.name}: ${l.available}`).join(" · ")}
                    {several && v.reserved > 0 && " · "}
                    {v.reserved > 0 && `${v.reserved} held for orders`}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <RecordStockDialog productId={productId} visible={recording} onHide={() => setRecording(false)} />
      <StockHistoryDialog productId={productId} visible={history} onHide={() => setHistory(false)} />
    </Card>
  );
}

/** The product's movements, newest first, five at a time. */
function StockHistoryDialog({ productId, visible, onHide }: { productId: string; visible: boolean; onHide: () => void }) {
  const [page, setPage] = useState(1);
  const rows = 5;
  const query = useQuery({
    queryKey: ["stock-movements", productId, page],
    queryFn: () => getStockMovements(productId, { page, per_page: rows }),
    enabled: visible,
    placeholderData: (previous) => previous,
  });
  const list: StockMovement[] = query.data?.data ?? [];

  return (
    <Dialog header="Stock history" visible={visible} onHide={onHide} style={{ width: "min(40rem, 95vw)" }}>
      {query.isPending ? (
        <div className="h-48 animate-pulse rounded-xl bg-(--border-color)/40" role="status" aria-label="Loading" />
      ) : list.length === 0 ? (
        <p className="text-sm text-(--text-muted)">Nothing recorded yet.</p>
      ) : (
        <>
          <ol className="divide-y divide-(--border-color)">
            {list.map((m) => (
              <li key={m.id} className="flex flex-wrap items-start justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-(--text-primary)">
                    {m.reason}{m.variant_label ? ` · ${m.variant_label}` : ""}
                  </span>
                  <span className="block text-xs text-(--text-muted)">
                    {m.location} · {dateTime(m.created_at)}{m.created_by ? ` · ${m.created_by.name}` : ""}
                  </span>
                  {m.note && <span className="block text-xs text-(--text-secondary)">{m.note}</span>}
                </span>
                <span className="shrink-0 text-right text-sm">
                  {m.on_hand_change !== 0 && <span className="block font-semibold">{signed(m.on_hand_change)}</span>}
                  {m.reserved_change !== 0 && <span className="block text-xs text-(--text-muted)">held {signed(m.reserved_change)}</span>}
                  <span className="block text-xs text-(--text-muted)">then {m.on_hand_after} on hand</span>
                </span>
              </li>
            ))}
          </ol>
          <Paginator first={(page - 1) * rows} rows={rows} totalRecords={query.data?.meta.total ?? 0} onPageChange={(e) => setPage(e.page + 1)} className="mt-2" />
        </>
      )}
    </Dialog>
  );
}
