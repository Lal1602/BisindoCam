// Turns a noisy stream of per-frame probabilities into deliberate letters.
// A letter is committed once its smoothed confidence stays above `threshold`
// for `holdMs`. The same letter can only repeat after the hand changes shape
// or leaves the frame — that is how a signer spells double letters.

export type StabilizerOptions = { threshold: number; holdMs: number; smoothing: number; releaseMs: number };

export type StabilizerState = {
  /** Current best guess, shown faintly before it is committed. */
  candidate: string | null;
  confidence: number;
  /** 0..1 progress towards committing the candidate. */
  progress: number;
  /** Set on the single update where a letter is committed. */
  committed: string | null;
};

const DEFAULTS: StabilizerOptions = { threshold: 0.7, holdMs: 450, smoothing: 0.35, releaseMs: 300 };

export class Stabilizer {
  private opts: StabilizerOptions;
  private ema: Float32Array | null = null;
  private candidate = -1;
  private since = 0;
  private lastCommitted = -1;
  private releasedAt = 0;

  constructor(
    private labels: string[],
    options: Partial<StabilizerOptions> = {},
  ) {
    this.opts = { ...DEFAULTS, ...options };
  }

  /** Smoothed probabilities from the last update (null while no hand is visible). */
  get smoothed(): Float32Array | null {
    return this.ema;
  }

  reset() {
    this.ema = null;
    this.candidate = -1;
    this.lastCommitted = -1;
  }

  /** Feed one frame. Pass `null` when no hand is visible. */
  update(probs: Float32Array | null, now: number): StabilizerState {
    const idle: StabilizerState = { candidate: null, confidence: 0, progress: 0, committed: null };
    if (!probs) {
      if (this.ema) this.releasedAt = now;
      this.ema = null;
      this.candidate = -1;
      if (now - this.releasedAt >= this.opts.releaseMs) this.lastCommitted = -1;
      return idle;
    }

    const a = this.opts.smoothing;
    if (!this.ema) this.ema = Float32Array.from(probs);
    else for (let i = 0; i < probs.length; i++) this.ema[i] = this.ema[i] * (1 - a) + probs[i] * a;

    let best = 0;
    for (let i = 1; i < this.ema.length; i++) if (this.ema[i] > this.ema[best]) best = i;
    const confidence = this.ema[best];

    if (best !== this.candidate) {
      this.candidate = best;
      this.since = now;
      if (best !== this.lastCommitted) this.lastCommitted = -1; // shape changed: allow repeats again
    }

    const ready = confidence >= this.opts.threshold;
    const progress = ready ? Math.min(1, (now - this.since) / this.opts.holdMs) : 0;
    let committed: string | null = null;
    if (progress >= 1 && this.lastCommitted !== best) {
      committed = this.labels[best];
      this.lastCommitted = best;
    }
    return { candidate: this.labels[best], confidence, progress: this.lastCommitted === best ? 1 : progress, committed };
  }
}
