"use client";

import { useState } from "react";

/**
 * Single-series horizontal bars (one hue, so no legend). Each bar has a
 * hover/focus tooltip; the same numbers are exposed as a table for screen
 * readers.
 */
export function AccuracyBars({
  data,
  caption,
  unit,
  labelWidth = "1.5rem",
}: {
  data: { label: string; value: number | null }[];
  caption: string;
  unit: string;
  labelWidth?: string;
}) {
  const [active, setActive] = useState<string | null>(null);

  return (
    <figure>
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{d.value === null ? "—" : `${Math.round(d.value * 100)}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div aria-hidden className="grid items-center gap-x-3 gap-y-[3px]" style={{ gridTemplateColumns: `${labelWidth} 1fr` }}>
        {data.map((d) => {
          const pct = d.value === null ? 0 : Math.round(d.value * 100);
          return (
            <div key={d.label} className="contents">
              <span className={`font-display truncate leading-none ${labelWidth === "1.5rem" ? "text-lg" : "text-[0.95rem]"} ${active === d.label ? "text-ink" : "text-ink-muted"}`}>
                {d.label}
              </span>
              <div
                className="relative h-5"
                onPointerEnter={() => setActive(d.label)}
                onPointerLeave={() => setActive(null)}
              >
                {/* Recessive track, then the bar: 4px rounded data-end, flat at the baseline. */}
                <div className="absolute inset-y-[7px] left-0 right-0 bg-line/60" />
                <div
                  className="absolute inset-y-[3px] left-0 rounded-r-[4px] bg-data transition-[width] duration-700 ease-(--ease-quiet)"
                  style={{ width: `${pct}%` }}
                />
                {active === d.label && (
                  <span className="label absolute -top-7 z-10 whitespace-nowrap rounded-[2px] bg-ink px-2 py-1 text-paper normal-case" style={{ left: `min(${pct}%, calc(100% - 6rem))` }}>
                    {d.label} · {pct}% {unit}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div aria-hidden className="mt-2 grid gap-x-3" style={{ gridTemplateColumns: `${labelWidth} 1fr` }}>
        <span />
        <div className="label flex justify-between">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
    </figure>
  );
}
