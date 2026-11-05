"use client";

import { useState, type FormEvent } from "react";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { cameraProblem, type StageLabels } from "@/components/hero/hero-stage";
import { CameraPrint } from "@/components/stage/camera-print";
import { LiveSubtitle } from "@/components/subtitle/live-subtitle";
import { useLetterReader } from "@/lib/inference/use-letter-reader";
import { speak } from "@/lib/speech/speak";
import { useSpeechRecognition } from "@/lib/speech/use-speech-recognition";
import { useFrameSource } from "@/lib/vision/use-frame-source";
import { useHandTracking } from "@/lib/vision/use-hand-tracking";

type Labels = Dictionary["conversation"];
type Message = { from: "signer" | "speaker"; text: string; at: number };

const SPEECH_LANGS = [
  { code: "id-ID", label: "Bahasa Indonesia" },
  { code: "en-US", label: "English" },
];

export function Conversation({ labels, stage }: { labels: Labels; stage: StageLabels }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [speechLang, setSpeechLang] = useState("id-ID");
  const [faceToFace, setFaceToFace] = useState(false);

  const { videoRef, frameRef, aspectRef, status, start, stop } = useHandTracking();
  const live = status === "on";
  const { sourceRef } = useFrameSource(frameRef, live);
  const reader = useLetterReader({ frameRef, aspectRef, active: live });

  const push = (from: Message["from"], text: string) =>
    setMessages((m) => [...m, { from, text: text.trim(), at: Date.now() }]);

  const speech = useSpeechRecognition(speechLang, (text) => push("speaker", text));

  // Fingerspelled text and typed text are one outgoing message.
  const outgoing = `${reader.text}${reader.text && draft ? " " : ""}${draft}`.trim();

  function send(e?: FormEvent, aloud = false) {
    e?.preventDefault();
    if (!outgoing) return;
    push("signer", outgoing);
    if (aloud) speak(outgoing);
    reader.clear();
    setDraft("");
  }

  function download() {
    const lines = messages.map((m) => `[${new Date(m.at).toLocaleTimeString()}] ${m.from === "signer" ? labels.you : labels.them}: ${m.text}`);
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }));
    Object.assign(document.createElement("a"), { href: url, download: `${labels.fileName}.txt` }).click();
    URL.revokeObjectURL(url);
  }

  const lastHeard = [...messages].reverse().find((m) => m.from === "speaker")?.text ?? "";
  const micMessage =
    !speech.supported ? labels.micUnsupported : speech.status === "denied" ? labels.micDenied : speech.status === "error" ? labels.micError : null;
  const problem = cameraProblem(status, stage);
  const pill = "rounded-full border hairline px-4 py-2 text-[0.9rem] transition-colors duration-300 hover:border-ink disabled:opacity-40";

  return (
    <div className="grid gap-12">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b hairline pb-4">
        <label className="flex cursor-pointer items-center gap-3">
          <input type="checkbox" checked={faceToFace} onChange={(e) => setFaceToFace(e.target.checked)} className="size-4 accent-(--moss)" />
          <span>{labels.faceToFace}</span>
          <span className="hidden text-[0.9rem] text-ink-muted md:inline">— {labels.faceToFaceHint}</span>
        </label>
        <p className="label max-w-[60ch] normal-case tracking-normal">{labels.privacy}</p>
      </div>

      <div className="grid gap-12 lg:grid-cols-2 lg:gap-x-10">
        {/* The Deaf friend's side: sign or type. */}
        <section aria-labelledby="signer-title" className="grid content-start gap-5">
          <header>
            <h2 id="signer-title" className="font-display text-[clamp(1.75rem,1.3rem+1.5vw,2.5rem)]">
              {labels.signerTitle}
            </h2>
            <p className="text-ink-muted">{labels.signerHint}</p>
          </header>
          <CameraPrint videoRef={videoRef} source={sourceRef} aspect={aspectRef} live={live} className="aspect-[4/3]" />
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={live ? stop : start} disabled={status === "starting"} className={pill}>
              {status === "starting" ? stage.starting : live ? stage.stopCamera : stage.startCamera}
            </button>
            {problem && (
              <span role="alert" className="text-clay">
                {problem}
              </span>
            )}
          </div>
          {live && (
            <LiveSubtitle
              text={reader.text}
              candidate={reader.status === "ready" ? reader.candidate : null}
              progress={reader.progress}
              placeholder={stage.subtitleSpell}
              className="text-[clamp(1.5rem,1.1rem+1.2vw,2.25rem)]"
            />
          )}
          <form onSubmit={send} className="grid gap-3">
            <label className="sr-only" htmlFor="signer-draft">
              {labels.typePlaceholder}
            </label>
            <textarea
              id="signer-draft"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) send(e as unknown as FormEvent, true);
              }}
              rows={2}
              placeholder={labels.typePlaceholder}
              className="w-full resize-none rounded-[2px] border hairline bg-paper-raised p-4 text-[1.1rem] outline-none focus:border-ink"
            />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={(e) => send(e as unknown as FormEvent, true)} disabled={!outgoing} className="rounded-full bg-ink px-5 py-2.5 text-paper transition-colors hover:bg-moss disabled:opacity-40">
                {labels.sendAndSpeak}
              </button>
              <button type="submit" disabled={!outgoing} className={pill}>
                {labels.send}
              </button>
            </div>
          </form>
        </section>

        {/* The hearing friend's side: speak; large text for the Deaf friend to read. */}
        <section
          aria-labelledby="speaker-title"
          className={`grid content-start gap-5 transition-transform duration-700 ease-(--ease-quiet) ${faceToFace ? "rotate-180" : ""}`}
        >
          <header>
            <h2 id="speaker-title" className="font-display text-[clamp(1.75rem,1.3rem+1.5vw,2.5rem)]">
              {labels.speakerTitle}
            </h2>
            <p className="text-ink-muted">{labels.speakerHint}</p>
          </header>
          <div className="flex min-h-[14rem] flex-col justify-end rounded-[2px] border hairline bg-paper-raised p-6">
            <p aria-live="polite" className="font-display text-[clamp(1.75rem,1.2rem+2vw,3rem)] leading-tight">
              {speech.interim ? <span className="text-ink-muted italic">{speech.interim}</span> : lastHeard || <span className="text-ink-muted italic">…</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={speech.status === "listening" ? speech.stop : speech.start}
              disabled={!speech.supported}
              className={`flex items-center gap-3 rounded-full px-5 py-2.5 transition-colors disabled:opacity-40 ${speech.status === "listening" ? "bg-clay text-paper" : "bg-ink text-paper hover:bg-moss"}`}
            >
              <span aria-hidden className={`size-2 rounded-full bg-current ${speech.status === "listening" ? "animate-pulse" : ""}`} />
              {speech.status === "listening" ? labels.stopListening : labels.listen}
            </button>
            <label className="flex items-center gap-2 text-[0.9rem] text-ink-muted">
              {labels.speechLang}
              <select
                value={speechLang}
                onChange={(e) => {
                  speech.stop();
                  setSpeechLang(e.target.value);
                }}
                className="rounded-full border hairline bg-paper px-3 py-1.5 text-ink"
              >
                {SPEECH_LANGS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {micMessage && (
            <p role="alert" className="text-clay">
              {micMessage}
            </p>
          )}
        </section>
      </div>

      <section aria-labelledby="log-title" className="border-t hairline pt-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 id="log-title" className="label">
            {labels.log}
          </h2>
          <div className="flex gap-2">
            <button type="button" onClick={download} disabled={!messages.length} className={pill}>
              {labels.downloadLog}
            </button>
            <button type="button" onClick={() => setMessages([])} disabled={!messages.length} className={pill}>
              {labels.clearLog}
            </button>
          </div>
        </div>
        {messages.length === 0 ? (
          <p className="text-ink-muted">{labels.logEmpty}</p>
        ) : (
          <ol className="grid gap-4">
            {messages.map((m) => (
              <li key={m.at} className={`flex max-w-[44rem] flex-col gap-1 ${m.from === "speaker" ? "ml-auto items-end text-right" : ""}`}>
                <span className="label">
                  {m.from === "signer" ? labels.you : labels.them} · {new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className={`font-display text-[clamp(1.25rem,1rem+0.8vw,1.75rem)] leading-snug ${m.from === "speaker" ? "text-moss" : ""}`}>
                  {m.text}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
