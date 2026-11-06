// Temporal ghost hand buffer.
//
// MediaPipe drops a hand that is briefly occluded (e.g. during N, M, or any
// two-hand overlap). Without this buffer the absent hand's feature slot is
// zeroed and cross-hand features disappear, causing the classifier to fail.
//
// The buffer keeps the last-known landmarks for each hand and re-injects them
// into the frame for up to GHOST_TTL_FRAMES frames with an exponentially
// decaying score. The score decay signals "lower certainty" without producing
// a hard zero that would look like "no hand at all" to the feature extractor.
//
// API: call `apply(frame)` on every raw MediaPipe frame. The returned
// HandFrame is safe to pass to frameFeatures / wordFrameFeatures unchanged.

import type { HandFrame, TrackedHand } from "./hand";

/** How many frames to hold a ghost after the hand disappears (~267ms @ 30fps). */
const GHOST_TTL_FRAMES = 8;

/** Score multiplier per frame the hand is absent (0.85^8 ≈ 0.27). */
const GHOST_DECAY = 0.85;

type GhostSlot = {
  hand: TrackedHand;
  ttl: number;
};

export class HandGhostBuffer {
  private ghosts = new Map<"Left" | "Right", GhostSlot>();

  /**
   * Apply the ghost buffer to a raw HandFrame.
   * Returns a new HandFrame where missing hands are filled from the buffer
   * (with decayed scores). Does NOT mutate the input frame.
   */
  apply(frame: HandFrame): HandFrame {
    const seen = new Set<"Left" | "Right">();

    // Update ghosts for hands that ARE present this frame.
    for (const hand of frame.hands) {
      seen.add(hand.side);
      this.ghosts.set(hand.side, { hand, ttl: GHOST_TTL_FRAMES });
    }

    // Decay or expire ghosts for hands that are ABSENT this frame.
    const ghostHands: TrackedHand[] = [];
    for (const [side, slot] of this.ghosts) {
      if (seen.has(side)) continue; // hand is real this frame, skip

      slot.ttl -= 1;
      if (slot.ttl <= 0) {
        this.ghosts.delete(side);
        continue;
      }

      // Re-inject with decayed score so the feature extractor still sees it.
      const decayedScore = slot.hand.score * Math.pow(GHOST_DECAY, GHOST_TTL_FRAMES - slot.ttl);
      ghostHands.push({ ...slot.hand, score: decayedScore });
    }

    if (ghostHands.length === 0) return frame; // nothing changed

    // Merge: real hands first, then ghosts. Preserve frame identity otherwise.
    return {
      ...frame,
      hands: [...frame.hands, ...ghostHands],
    };
  }

  /** Reset all ghosts (call when camera stops). */
  reset() {
    this.ghosts.clear();
  }
}

