"use client";

/**
 * Committed text in ink, followed by the letter currently being held, drawn
 * faintly with a hairline that fills as it is about to commit. Screen readers
 * only hear committed text, not every flicker of the candidate.
 */
export function LiveSubtitle({
  text,
  candidate,
  progress,
  placeholder,
  tail = 28,
  className = "",
}: {
  text: string;
  candidate: string | null;
  progress: number;
  placeholder: string;
  /** Show only the last `tail` characters (the hero has little room). */
  tail?: number;
  className?: string;
}) {
  const shown = text.length > tail ? `…${text.slice(-tail)}` : text;
  const pending = candidate && progress < 1 ? candidate : null;

  return (
    <div className={`font-display leading-tight ${className}`}>
      <p className="sr-only" aria-live="polite">
        {text}
      </p>
      <p aria-hidden className="min-h-[1.2em] break-words">
        {!shown && !pending ? (
          <span className="italic text-ink-muted">{placeholder}</span>
        ) : (
          <>
            <span>{shown}</span>
            {pending && (
              <span className="relative ml-[0.04em] inline-block italic text-clay/60">
                {pending}
                <span
                  className="absolute inset-x-0 -bottom-[0.08em] h-px origin-left bg-clay transition-transform duration-100"
                  style={{ transform: `scaleX(${progress})` }}
                />
              </span>
            )}
            <span className="ml-[0.06em] inline-block h-[0.9em] w-px translate-y-[0.12em] animate-pulse bg-ink/50" />
          </>
        )}
      </p>
    </div>
  );
}
