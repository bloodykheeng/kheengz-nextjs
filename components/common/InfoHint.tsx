"use client";

import { useRef } from "react";
import { OverlayPanel } from "primereact/overlaypanel";

/**
 * A small help overlay: the sentence behind a field, where the `<small>` under
 * it carries the short version. Inline, those turn a form into an essay; absent,
 * the register gets filled in wrongly by people acting reasonably.
 *
 * `text` is a paragraph and `children` is for anything with structure, which a
 * rule about numbers almost always has. Children win if both are given.
 *
 * Icons: `?` for actionable guidance, `i` for reference. If the reader must do
 * something with it use `?`, if they only need to know it use `i`.
 *
 * The trigger is a span rather than a button, and that is load-bearing: most
 * callers write the hint inside a `<label>`, which forwards clicks to the first
 * labelable element in it. A button is labelable, so clicking the field's name
 * opens the hint, and the forwarded event carries a different target, which
 * makes `OverlayPanel.toggle` hide and then re-show 200ms later. Keyboard
 * behaviour is restored by hand, a span having none.
 *
 * It stops propagation: it lives inside forms and clickable table rows, and
 * neither should react to it.
 */
export default function InfoHint({
  text,
  title,
  className,
  variant = "help",
  children,
}: {
  text?: string;
  title?: string;
  className?: string;
  variant?: "help" | "info";
  children?: React.ReactNode;
}) {
  const op = useRef<OverlayPanel>(null);

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        aria-label={title ?? (variant === "info" ? "About this" : "What is this?")}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          op.current?.toggle(e);
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          e.stopPropagation();
          op.current?.toggle(e);
        }}
        className={`pi ${
          variant === "info" ? "pi-info-circle" : "pi-question-circle"
        } inline-block cursor-help border-0 bg-transparent p-0 text-sm leading-none text-(--text-muted) transition-colors hover:text-(--text-primary) ${className ?? ""}`}
      />
      {/* Wider when there is structure to show: a table squeezed into `max-w-xs`
          wraps every cell and becomes harder to read than the prose it replaced. */}
      <OverlayPanel ref={op} className={children ? "max-w-md" : "max-w-xs"} dismissable>
        <div className="space-y-2 p-1 text-sm">
          {title && <p className="font-semibold text-(--text-primary)">{title}</p>}
          {children ?? (
            <p className="leading-relaxed text-(--text-secondary)">{text}</p>
          )}
        </div>
      </OverlayPanel>
    </>
  );
}

/**
 * Labelled points inside a hint, one per line.
 *
 * A hint is read standing up, not studied. Anything worth putting in an overlay
 * is usually two or three separate facts, and run together as a paragraph the
 * reader has to find the seams themselves before they can use any of it. Here
 * the seams are the layout: the term is what the point is about, the line under
 * it is the point.
 *
 * Shared so every hint that carries points looks the same, and so a caller
 * writes the points rather than the markup.
 */
export function HintPoints({
  points,
}: {
  points: { term: React.ReactNode; detail: React.ReactNode }[];
}) {
  return (
    <dl className="space-y-2">
      {points.map((point, index) => (
        <div key={index} className="space-y-0.5">
          <dt className="font-medium text-(--text-primary)">{point.term}</dt>
          <dd className="leading-relaxed text-(--text-secondary)">{point.detail}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * A worked example inside a hint: a small table with a caption under it.
 *
 * Shared so every hint that shows one looks the same, and so a caller writes rows
 * rather than markup.
 */
export function HintTable({
  headers,
  rows,
  caption,
}: {
  headers: string[];
  rows: React.ReactNode[][];
  caption?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="overflow-hidden rounded-md border border-(--border-color)">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-(--border-color) bg-(--bg-page) text-left text-(--text-muted)">
              {headers.map((header) => (
                <th key={header} className="px-2 py-1 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                className="border-b border-(--border-color) last:border-b-0"
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`px-2 py-1 ${
                      cellIndex === 0
                        ? "text-(--text-primary)"
                        : "text-(--text-secondary)"
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && (
        <p className="leading-relaxed text-xs text-(--text-secondary)">{caption}</p>
      )}
    </div>
  );
}
