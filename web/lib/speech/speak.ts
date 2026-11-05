/** Read text aloud with the browser's built-in voices. */
export function speak(text: string, lang = "id-ID") {
  if (!text.trim() || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text.toLowerCase());
  utterance.lang = lang;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}
