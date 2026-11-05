"use client";

import { useEffect, useRef, useState } from "react";
import { cameraProblem, type StageLabels } from "@/components/hero/hero-stage";
import { CameraPrint } from "@/components/stage/camera-print";
import { LiveSubtitle } from "@/components/subtitle/live-subtitle";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { useLetterReader } from "@/lib/inference/use-letter-reader";
import { useWordReader } from "@/lib/inference/use-word-reader";
import { speak } from "@/lib/speech/speak"; // fingerspelled BISINDO is Indonesian text, read as id-ID
import { useFrameSource } from "@/lib/vision/use-frame-source";
import { useHandTracking } from "@/lib/vision/use-hand-tracking";

type Labels = Dictionary["translate"];

const SIZES = ["text-[clamp(2rem,1.4rem+2vw,3rem)]", "text-[clamp(2.75rem,1.8rem+3.2vw,4.5rem)]", "text-[clamp(3.5rem,2rem+5vw,6.5rem)]"];

export function Translator({ labels, stage, english = false }: { labels: Labels; stage: StageLabels; english?: boolean }) {
  const { videoRef, frameRef, aspectRef, status, start, stop, enablePose } = useHandTracking();
  const live = status === "on";
  const { sourceRef, handCount } = useFrameSource(frameRef, live);
  const [mode, setMode] = useState<"letters" | "words">("letters");
  const [wordsAvailable, setWordsAvailable] = useState(false);
  const letters = useLetterReader({ frameRef, aspectRef, active: live && mode === "letters" });
  const words = useWordReader({ frameRef, aspectRef, active: live && mode === "words", english });

  // The word mode switches on once its model has been deployed.
  useEffect(() => {
    fetch("/models/words.json", { method: "HEAD" })
      .then((r) => setWordsAvailable(r.ok))
      .catch(() => {});
  }, []);

  // One interface over whichever reader is active.
  const reader =
    mode === "letters"
      ? letters
      : {
          ...words,
          space: () => {},
          progress: words.confidence,
        };
  const [size, setSize] = useState(1);


  const [autoSpeak, setAutoSpeak] = useState(false);

  // In word mode each committed word can be read aloud as it arrives.
  const lastSpoken = useRef("");
  useEffect(() => {
    if (words.text === lastSpoken.current) return;
    const added = words.text.startsWith(lastSpoken.current) ? words.text.slice(lastSpoken.current.length).trim() : "";
    lastSpoken.current = words.text;
    if (mode === "words" && autoSpeak && added) speak(added);
  }, [mode, words.text, autoSpeak]);
  const [copied, setCopied] = useState(false);

  // Keep the latest values reachable from the keyboard handler without re-binding it.
  const actions = useRef({ space: reader.space, backspace: reader.backspace, clear: reader.clear, text: reader.text, autoSpeak });
  useEffect(() => {
    actions.current = { space: reader.space, backspace: reader.backspace, clear: reader.clear, text: reader.text, autoSpeak };
  });

  function addSpace() {
    const { text, autoSpeak: auto } = actions.current;
    if (auto) speak(text.split(" ").filter(Boolean).at(-1) ?? "");
    actions.current.space();
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, button, a, [contenteditable]")) return;
      if (e.key === " ") {
        e.preventDefault();
        addSpace();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        actions.current.backspace();
      } else if (e.key === "Escape") {
        actions.current.clear();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(reader.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  }

  function download() {
    const url = URL.createObjectURL(new Blob([reader.text], { type: "text/plain;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${labels.fileName}.txt` });
    a.click();
    URL.revokeObjectURL(url);
  }

  const problem = cameraProblem(status, stage);
  const notice = live && handCount > 0 && reader.status === "missing" ? labels.modelMissing : live && reader.status === "error" ? labels.modelError : null;
  const hint = !live ? stage.subtitleDemo : handCount === 0 ? stage.subtitleWaiting : labels.placeholder;
  const button = "rounded-full border hairline px-4 py-2 text-[0.9rem] transition-colors duration-300 hover:border-ink disabled:opacity-40 disabled:hover:border-line";

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-x-10">
      <figure className="flex flex-col gap-4 lg:col-span-6">
        <CameraPrint videoRef={videoRef} source={sourceRef} aspect={aspectRef} live={live} className="aspect-[4/5] sm:aspect-[4/3] lg:aspect-[5/6]">
          <div className="label pointer-events-none absolute inset-x-6 top-6 flex justify-between gap-4">
            <span>{stage.figure}</span>
            <span className="text-right">{live ? stage.liveNote : stage.demoNote}</span>
          </div>
        </CameraPrint>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <button
            type="button"
            onClick={live ? stop : start}
            disabled={status === "starting"}
            className="rounded-full bg-ink px-6 py-3 text-paper transition-colors duration-500 hover:bg-moss disabled:opacity-50"
          >
            {status === "starting" ? stage.starting : live ? stage.stopCamera : stage.startCamera}
          </button>
          <span className="label">{stage.privacy}</span>
        </div>
        {problem && (
          <p role="alert" className="text-clay">
            {problem}
          </p>
        )}
      </figure>

      <section aria-labelledby="transcript-label" className="flex flex-col gap-8 lg:col-span-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b hairline pb-4">
          <div role="radiogroup" aria-label={labels.modeLabel} className="flex items-center gap-1 rounded-full border hairline p-1">
            {(["letters", "words"] as const).map((m) => {
              const disabled = m === "words" && !wordsAvailable;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  disabled={disabled}
                  onClick={() => {
                    setMode(m);
                    if (m === "words") void enablePose();
                  }}
                  className={`flex items-baseline gap-2 rounded-full px-4 py-1.5 text-[0.9rem] transition-colors ${mode === m ? "bg-ink text-paper" : "text-ink-muted hover:text-ink disabled:hover:text-ink-muted"}`}
                >
                  {m === "letters" ? labels.modeLetters : labels.modeWords}
                  {disabled && <span className="label text-[0.65rem]">{labels.wordsSoon}</span>}
                </button>
              );
            })}
          </div>
          <div role="radiogroup" aria-label={labels.textSize} className="flex items-center gap-3">
            <span className="label">{labels.textSize}</span>
            {labels.sizes.map((name, i) => (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={size === i}
                aria-label={name}
                onClick={() => setSize(i)}
                className={`font-display leading-none transition-colors ${size === i ? "text-ink" : "text-ink-muted hover:text-ink"}`}
                style={{ fontSize: `${1 + i * 0.35}rem` }}
              >
                A
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[12rem] flex-1">
          <h2 id="transcript-label" className="label mb-4">
            {labels.transcript}
          </h2>
          <LiveSubtitle
            text={reader.text}
            candidate={reader.status === "ready" ? reader.candidate : null}
            progress={reader.progress}
            placeholder={hint}
            tail={400}
            className={SIZES[size]}
          />
          {notice && (
            <p role="status" className="mt-6 max-w-[48ch] text-ink-muted">
              {notice}
            </p>
          )}
        </div>

        <div className="grid gap-4 border-t hairline pt-6">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={button} onClick={addSpace} disabled={mode === "words"}>
              {labels.space}
            </button>
            <button type="button" className={button} onClick={reader.backspace} disabled={!reader.text}>
              {labels.backspace}
            </button>
            <button type="button" className={button} onClick={reader.clear} disabled={!reader.text}>
              {labels.clear}
            </button>
            <span aria-hidden className="mx-1 w-px self-stretch bg-line" />
            <button type="button" className={button} onClick={() => speak(reader.text)} disabled={!reader.text}>
              {labels.speak}
            </button>
            <button type="button" className={button} onClick={copy} disabled={!reader.text}>
              <span aria-live="polite">{copied ? labels.copied : labels.copy}</span>
            </button>
            <button type="button" className={button} onClick={download} disabled={!reader.text}>
              {labels.download}
            </button>
          </div>
          <label className="flex cursor-pointer items-center gap-3 text-[0.95rem] text-ink-muted">
            <input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} className="size-4 accent-(--moss)" />
            {labels.autoSpeak}
          </label>
          <p className="label normal-case tracking-normal">{labels.shortcuts}</p>
        </div>
      </section>
    </div>
  );
}
