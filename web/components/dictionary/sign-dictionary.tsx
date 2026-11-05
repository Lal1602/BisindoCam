"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { CameraPrint } from "@/components/stage/camera-print";
import type { Locale } from "@/lib/i18n/config";
import { usePrefersReducedMotion } from "@/lib/use-theme";
import type { HandFrame } from "@/lib/vision/hand";
import { loadSigns, signFrameAt, type Sign } from "@/lib/vision/signs";

type Labels = Dictionary["dictionary"];
type Kind = "letters" | "words";

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function SignDictionary({ labels, locale }: { labels: Labels; locale: Locale }) {
  const [signs, setSigns] = useState<Record<Kind, Sign[] | null>>({ letters: null, words: null });
  const [kind, setKind] = useState<Kind>("letters");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<Kind, string>>({ letters: "A", words: "" });
  const still = usePrefersReducedMotion();
  const sourceRef = useRef<(() => HandFrame | null) | null>(null);

  useEffect(() => {
    Promise.all([loadSigns("letters"), loadSigns("words")]).then(([letters, words]) => {
      setSigns({ letters, words });
      // Deep links: /dictionary#K (letter) or /dictionary#makan (word).
      const hash = decodeURIComponent(location.hash.slice(1));
      if (letters.some((s) => s.id === hash.toUpperCase())) setSelected((s) => ({ ...s, letters: hash.toUpperCase() }));
      else if (words.some((s) => s.id === hash.toLowerCase())) {
        setKind("words");
        setSelected({ letters: "A", words: hash.toLowerCase() });
      } else if (words.length) setSelected((s) => ({ ...s, words: words[0].id }));
    });
  }, []);

  const list = signs[kind];
  const current = list?.find((s) => s.id === selected[kind]) ?? null;
  useEffect(() => {
    const t0 = performance.now();
    sourceRef.current = current ? () => (still ? current.frame : signFrameAt(current, (performance.now() - t0) / 1000)) : () => null;
  }, [current, still]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (list ?? []).filter((s) => s.id.toLowerCase().includes(q) || s.en?.toLowerCase().includes(q));
  }, [list, query]);

  function choose(id: string) {
    setSelected((s) => ({ ...s, [kind]: id }));
    history.replaceState(null, "", `#${encodeURIComponent(id)}`);
  }

  const title = current ? (kind === "letters" ? current.id : capitalise(current.id)) : "";
  const gloss = kind === "words" && current?.en && locale === "en" ? current.en : null;
  const tab = (active: boolean) =>
    `flex items-baseline gap-2 rounded-full px-4 py-1.5 text-[0.9rem] transition-colors ${active ? "bg-ink text-paper" : "text-ink-muted hover:text-ink disabled:hover:text-ink-muted"}`;

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-x-10">
      <figure className="lg:sticky lg:top-24 lg:col-span-6 lg:self-start">
        <CameraPrint source={sourceRef} live={false} mirrored={false} orbit className="aspect-[4/5] sm:aspect-[5/4] lg:aspect-[5/6]">
          <div className="label pointer-events-none absolute inset-x-6 top-6 flex justify-between gap-4">
            <span>{kind === "letters" ? `${labels.letterLabel} ${title}` : title}</span>
            <span className="text-right">{labels.stageNote}</span>
          </div>
          <span
            aria-hidden
            className="font-display pointer-events-none absolute bottom-2 left-6 max-w-[90%] truncate text-[clamp(4rem,2.5rem+6vw,10rem)] leading-none text-ink/10 italic"
          >
            {title}
          </span>
        </CameraPrint>
        <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <span className="font-display text-3xl">
            {kind === "letters" && <>{labels.letterLabel} </>}
            <span className="text-clay italic">{title}</span>
            {gloss && <span className="ml-3 text-xl text-ink-muted">“{gloss}”</span>}
          </span>
          {kind === "letters" && (
            <Link href={`/${locale}/learn#${selected.letters}`} className="link-quiet">
              {labels.practice} →
            </Link>
          )}
        </figcaption>
        <p className="sr-only" aria-live="polite">
          {title}
        </p>
      </figure>

      <section className="lg:col-span-6">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b hairline pb-4">
          <div role="tablist" className="flex items-center gap-1 rounded-full border hairline p-1">
            <button type="button" role="tab" aria-selected={kind === "letters"} onClick={() => setKind("letters")} className={tab(kind === "letters")}>
              {labels.tabLetters}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={kind === "words"}
              disabled={!signs.words?.length}
              onClick={() => setKind("words")}
              className={tab(kind === "words")}
            >
              {labels.tabWords}
              {signs.words && signs.words.length > 0 ? (
                <span className="label text-[0.65rem] opacity-70">{signs.words.length}</span>
              ) : (
                <span className="label text-[0.65rem]">{labels.wordsSoon}</span>
              )}
            </button>
          </div>
          <label className="flex min-w-[12rem] flex-1 items-center gap-3 border-b border-ink/30 py-1 focus-within:border-ink sm:flex-none">
            <span className="sr-only">{labels.search}</span>
            <svg aria-hidden viewBox="0 0 20 20" className="size-4 text-ink-muted">
              <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
              <path d="m13 13 4 4" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={labels.search}
              className="w-full bg-transparent outline-none placeholder:text-ink-muted"
            />
          </label>
        </div>

        {!list ? (
          <p className="text-ink-muted">{labels.loading}</p>
        ) : list.length === 0 ? (
          <p className="text-ink-muted">{labels.missing}</p>
        ) : visible.length === 0 ? (
          <p className="text-ink-muted">{labels.empty}</p>
        ) : kind === "letters" ? (
          <ul className="grid grid-cols-4 gap-px bg-line sm:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6">
            {visible.map((s) => (
              <li key={s.id} className="bg-paper">
                <button
                  type="button"
                  aria-pressed={s.id === selected.letters}
                  onClick={() => choose(s.id)}
                  className="font-display grid aspect-square w-full place-items-center text-[clamp(1.75rem,1.2rem+1.5vw,2.75rem)] transition-colors duration-300 hover:bg-paper-raised aria-pressed:bg-ink aria-pressed:text-paper aria-pressed:italic"
                >
                  {s.id}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="grid grid-cols-1 border-t hairline sm:grid-cols-2">
            {visible.map((s) => (
              <li key={s.id} className="border-b hairline">
                <button
                  type="button"
                  aria-pressed={s.id === selected.words}
                  onClick={() => choose(s.id)}
                  className="group flex w-full items-baseline justify-between gap-4 px-2 py-3 text-left transition-colors hover:bg-paper-raised aria-pressed:bg-ink aria-pressed:text-paper"
                >
                  <span className="font-display text-[1.4rem] leading-tight group-aria-pressed:italic">{capitalise(s.id)}</span>
                  <span className="text-[0.85rem] text-ink-muted group-aria-pressed:text-paper/70">{s.en}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-8 max-w-[56ch] text-[0.95rem] text-ink-muted">{labels.caveat}</p>
      </section>
    </div>
  );
}
