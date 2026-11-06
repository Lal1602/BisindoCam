"use client";

import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { cameraProblem, type StageLabels } from "@/components/hero/hero-stage";
import { CameraPrint } from "@/components/stage/camera-print";
import { useLetterReader } from "@/lib/inference/use-letter-reader";
import type { HandFrame } from "@/lib/vision/hand";
import { loadSigns, type Sign } from "@/lib/vision/signs";
import { useFrameSource } from "@/lib/vision/use-frame-source";
import { useHandTracking } from "@/lib/vision/use-hand-tracking";

type Labels = Dictionary["learn"];

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const PASS = 0.7; // smoothed confidence needed for the target letter
const HOLD_MS = 700;
const STORE = "isyarat:mastered";

function readMastered(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? "[]");
  } catch {
    return [];
  }
}

export function Practice({ labels, stage }: { labels: Labels; stage: StageLabels }) {
  const [mode, setMode] = useState<"letters" | "name">("letters");
  const [queue, setQueue] = useState<string[]>(LETTERS);
  const [index, setIndex] = useState(0);
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);
  const [mastered, setMastered] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [hold, setHold] = useState(0);
  const [success, setSuccess] = useState(false);
  const [signs, setSigns] = useState<Sign[]>([]);

  const { videoRef, frameRef, aspectRef, hasHandsRef, status, start, stop } = useHandTracking();
  const live = status === "on";
  const { sourceRef } = useFrameSource(frameRef, live);
  const reader = useLetterReader({ frameRef, aspectRef, active: live });
  const referenceRef = useRef<(() => HandFrame | null) | null>(null);

  const target = queue[index] ?? null;

  useEffect(() => {
    loadSigns("letters").then((loaded) => {
      setSigns(loaded);
      setMastered(readMastered());
      // Deep link from the dictionary: /learn#K starts on that letter.
      const hash = decodeURIComponent(location.hash.slice(1)).toUpperCase();
      if (LETTERS.includes(hash)) setIndex(LETTERS.indexOf(hash));
    });
  }, []);

  useEffect(() => {
    const frame = signs.find((s) => s.id === target)?.frame ?? null;
    referenceRef.current = () => frame;
  }, [signs, target]);

  // Score the target letter a few times a second; succeed once it is held.
  useEffect(() => {
    if (!live || reader.status !== "ready" || !target || success) return;
    let since = 0;
    const id = setInterval(() => {
      const p = reader.scoresRef.current.get(target) ?? 0;
      setScore(p);
      const now = performance.now();
      if (p >= PASS) {
        since ||= now;
        const progress = Math.min(1, (now - since) / HOLD_MS);
        setHold(progress);
        if (progress >= 1) setSuccess(true);
      } else {
        since = 0;
        setHold(0);
      }
    }, 100);
    return () => clearInterval(id);
  }, [live, reader.status, reader.scoresRef, target, success]);

  // Record a success, then move on after a short pause.
  useEffect(() => {
    if (!success || !target) return;
    const next = [...new Set([...readMastered(), target])];
    try {
      localStorage.setItem(STORE, JSON.stringify(next));
    } catch {}
    const t = setTimeout(() => {
      setMastered(next);
      advance();
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- advance reads the latest queue on purpose
  }, [success]);

  function advance() {
    setSuccess(false);
    setHold(0);
    setScore(0);
    if (index + 1 < queue.length) setIndex(index + 1);
    else if (mode === "name") setDone(true);
    else setIndex(0);
  }

  function startName() {
    const letters = name.toUpperCase().split("").filter((c) => LETTERS.includes(c));
    if (!letters.length) return;
    setQueue(letters);
    setIndex(0);
    setDone(false);
  }

  function switchMode(next: "letters" | "name") {
    setMode(next);
    setQueue(next === "letters" ? LETTERS : []);
    setIndex(0);
    setDone(false);
    setSuccess(false);
  }

  const problem = cameraProblem(status, stage);
  const tab = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-[0.9rem] transition-colors ${active ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"}`;

  return (
    <div className="grid gap-10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b hairline pb-4">
        <div role="tablist" className="flex items-center gap-1 rounded-full border hairline p-1">
          <button type="button" role="tab" aria-selected={mode === "letters"} onClick={() => switchMode("letters")} className={tab(mode === "letters")}>
            {labels.modeLetters}
          </button>
          <button type="button" role="tab" aria-selected={mode === "name"} onClick={() => switchMode("name")} className={tab(mode === "name")}>
            {labels.modeName}
          </button>
        </div>
        <button type="button" onClick={live ? stop : start} disabled={status === "starting"} className="rounded-full bg-ink px-5 py-2.5 text-paper transition-colors hover:bg-moss disabled:opacity-50">
          {status === "starting" ? stage.starting : live ? stage.stopCamera : stage.startCamera}
        </button>
      </div>
      {problem && (
        <p role="alert" className="text-clay">
          {problem}
        </p>
      )}

      {mode === "name" && !queue.length ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startName();
          }}
          className="flex flex-wrap items-end gap-4"
        >
          <label className="grid gap-2">
            <span className="label">{labels.namePlaceholder}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="font-display w-[min(28rem,80vw)] border-b border-ink/40 bg-transparent py-2 text-[clamp(2rem,1.4rem+2vw,3.25rem)] outline-none focus:border-ink"
              autoComplete="given-name"
            />
          </label>
          <button type="submit" disabled={!name.trim()} className="rounded-full border border-ink px-5 py-2.5 hover:bg-ink hover:text-paper disabled:opacity-40">
            {labels.nameStart}
          </button>
        </form>
      ) : done ? (
        <div className="grid gap-6">
          <p className="font-display text-[clamp(2rem,1.4rem+3vw,4.5rem)] leading-tight">
            {labels.nameDone} <span className="text-clay italic">{queue.join("")}</span>.
          </p>
          <button type="button" onClick={() => switchMode("name")} className="w-fit rounded-full border border-ink px-5 py-2.5 hover:bg-ink hover:text-paper">
            {labels.again}
          </button>
        </div>
      ) : (
        <>
          {mode === "name" && (
            <p aria-label={queue.join("")} className="font-display flex flex-wrap gap-2 text-[clamp(2rem,1.5rem+2vw,3.5rem)] leading-none">
              {queue.map((c, i) => (
                <span key={i} className={i < index ? "text-moss" : i === index ? "text-clay italic underline decoration-1 underline-offset-8" : "text-ink-muted"}>
                  {c}
                </span>
              ))}
            </p>
          )}

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-x-10">
            <figure className="grid gap-3">
              <CameraPrint source={referenceRef} live={false} mirrored={false} orbit className="aspect-[4/3]">
                <span className="label pointer-events-none absolute top-6 left-6">{labels.reference}</span>
              </CameraPrint>
              <figcaption className="flex items-baseline justify-between gap-4">
                <span className="font-display text-[clamp(2.5rem,2rem+2vw,4rem)] leading-none">
                  {labels.target} <span className="text-clay italic">{target}</span>
                </span>
                <button type="button" onClick={advance} className="link-quiet text-ink-muted">
                  {labels.skip} →
                </button>
              </figcaption>
            </figure>

            <figure className="grid gap-3">
              <CameraPrint videoRef={videoRef} source={sourceRef} aspect={aspectRef} hasHandsRef={hasHandsRef} live={live} className="aspect-[4/3]">
                <span className="label pointer-events-none absolute top-6 left-6">{labels.you}</span>
                {success && (
                  <span className="font-display pointer-events-none absolute inset-0 grid place-items-center bg-paper/70 text-[clamp(2.5rem,2rem+3vw,5rem)] text-moss italic">
                    {labels.correct}
                  </span>
                )}
              </CameraPrint>
              <figcaption className="flex items-center gap-4" aria-live="polite">
                <svg viewBox="0 0 36 36" className="size-12 -rotate-90" aria-hidden>
                  <circle cx="18" cy="18" r="15" fill="none" stroke="var(--line)" strokeWidth="2.5" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="var(--moss)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={`${hold * 94.2} 94.2`}
                    className="transition-[stroke-dasharray] duration-100"
                  />
                </svg>
                <span className="text-ink-muted">
                  {!live
                    ? labels.cameraFirst
                    : reader.status === "missing" || reader.status === "error"
                      ? labels.modelNotReady
                      : `${labels.holdHint} · ${labels.confidence} ${Math.round(score * 100)}%`}
                </span>
              </figcaption>
            </figure>
          </div>
        </>
      )}

      <section className="border-t hairline pt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h2 className="label">
            {labels.progress} · {mastered.length}/26
          </h2>
          {mastered.length > 0 && (
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem(STORE);
                } catch {}
                setMastered([]);
              }}
              className="link-quiet text-[0.9rem] text-ink-muted"
            >
              {labels.reset}
            </button>
          )}
        </div>
        <ul className="font-display flex flex-wrap gap-x-4 gap-y-2 text-[clamp(1.5rem,1.2rem+1vw,2.25rem)]">
          {LETTERS.map((l) => (
            <li key={l}>
              <button
                type="button"
                onClick={() => {
                  switchMode("letters");
                  setIndex(LETTERS.indexOf(l));
                }}
                className={`transition-colors ${mastered.includes(l) ? "text-moss" : "text-ink-muted/50 hover:text-ink"} ${mode === "letters" && l === target ? "text-clay italic" : ""}`}
              >
                {l}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
