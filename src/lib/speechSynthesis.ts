/**
 * High-Quality Web Speech API Text-to-Speech (TTS) Voice Engine
 * Optimized for natural language dynamics, smooth articulation, and natural cadence.
 */

export interface VoiceOptions {
  rate?: number; // 0.8 to 1.2 (Default: 0.95 for natural speech)
  pitch?: number; // 0.8 to 1.2 (Default: 1.0 for natural tone)
  volume?: number; // 0 to 1.0 (Default: 1.0)
  lang?: string; // Target locale (Default: 'en-ZA' or 'en-GB' / 'en-US')
}

let activeUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Sanitizes markdown markup into clean, speakable natural text.
 */
export function sanitizeTextForSpeech(text: string): string {
  if (!text) return "";
  return text
    .replace(/```[\s\S]*?```/g, " [Code snippet omitted] ") // Strip code blocks
    .replace(/`([^`]+)`/g, "$1") // Strip inline code backticks
    .replace(/\*\*([^*]+)\*\*/g, "$1") // Strip bold **
    .replace(/\*([^*]+)\*/g, "$1") // Strip italic *
    .replace(/#+\s+/g, "") // Strip heading hashes
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Convert links [text](url) to text
    .replace(/^[*-]\s+/gm, "") // Strip bullet points
    .replace(/\n+/g, ". ") // Convert linebreaks to sentence pauses
    .replace(/\s+/g, " ") // Normalize spaces
    .trim();
}

/**
 * Retrieves the best available natural human voice from browser voices.
 */
export function getBestVoice(preferredLang: string = "en-ZA"): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  // Priority 1: South African English (en-ZA)
  const zaVoice = voices.find((v) => v.lang.toLowerCase().startsWith("en-za") || v.lang.toLowerCase().includes("za"));
  if (zaVoice) return zaVoice;

  // Priority 2: Natural / Neural / Premium English voices
  const premiumVoice = voices.find(
    (v) =>
      v.lang.toLowerCase().startsWith("en") &&
      (v.name.includes("Natural") ||
        v.name.includes("Neural") ||
        v.name.includes("Google") ||
        v.name.includes("Samantha") ||
        v.name.includes("Daniel") ||
        v.name.includes("Karen") ||
        v.name.includes("Moira"))
  );
  if (premiumVoice) return premiumVoice;

  // Priority 3: British English (en-GB)
  const gbVoice = voices.find((v) => v.lang.toLowerCase().startsWith("en-gb"));
  if (gbVoice) return gbVoice;

  // Priority 4: Any English voice
  const anyEnglish = voices.find((v) => v.lang.toLowerCase().startsWith("en"));
  if (anyEnglish) return anyEnglish;

  // Fallback to default
  return voices[0] || null;
}

/**
 * Speaks text using natural voice dynamics, appropriate speaking rate, and natural pitch.
 */
export function speakText(
  text: string,
  options: VoiceOptions = {},
  onEnd?: () => void,
  onError?: (err: any) => void
): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    console.warn("Web Speech API not supported in this browser environment.");
    return false;
  }

  // Cancel any ongoing speech
  stopSpeech();

  const cleanText = sanitizeTextForSpeech(text);
  if (!cleanText) return false;

  const utterance = new SpeechSynthesisUtterance(cleanText);

  // Natural audio dynamics
  utterance.rate = options.rate ?? 0.95; // Slightly slower than 1.0 for clear, natural cadence
  utterance.pitch = options.pitch ?? 1.0; // Natural pitch (1.0 = human default)
  utterance.volume = options.volume ?? 1.0;

  const selectedVoice = getBestVoice(options.lang);
  if (selectedVoice) {
    utterance.voice = selectedVoice;
    utterance.lang = selectedVoice.lang;
  } else {
    utterance.lang = options.lang || "en-ZA";
  }

  utterance.onend = () => {
    activeUtterance = null;
    if (onEnd) onEnd();
  };

  utterance.onerror = (e) => {
    activeUtterance = null;
    console.error("SpeechSynthesis error:", e);
    if (onError) onError(e);
  };

  activeUtterance = utterance;
  window.speechSynthesis.speak(utterance);
  return true;
}

/**
 * Stops any ongoing audio speech synthesis.
 */
export function stopSpeech() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    activeUtterance = null;
  }
}

/**
 * Checks whether speech synthesis is currently active/speaking.
 */
export function isSpeaking(): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  return window.speechSynthesis.speaking;
}
