/** Minimal typings + helpers for the browser Web Speech API. */

export interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
export interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}
export interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResult };
}
export interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}
export interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type Ctor = new () => SpeechRecognitionLike;

export function getSpeechRecognition(): Ctor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: Ctor;
    webkitSpeechRecognition?: Ctor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Heuristic: does this utterance sound like the user trailed off mid-thought? */
export function soundsIncomplete(text: string): boolean {
  const t = text.trim().toLowerCase().replace(/[.,!?]+$/, "");
  if (!t) return true;
  const last = t.split(/\s+/).slice(-1)[0] ?? "";
  const danglers = new Set([
    "i", "can", "could", "would", "should", "how", "what", "the", "a", "an", "to", "of",
    "and", "or", "but", "if", "for", "with", "my", "your", "in", "on", "about", "is",
    "are", "was", "do", "does", "so", "that", "this", "you", "we", "it", "like", "want",
    "need", "please", "let", "make", "get", "give", "tell", "explain", "when", "where",
    "who", "why", "which", "there", "then", "just", "really", "very",
  ]);
  return danglers.has(last) || t.split(/\s+/).length < 2;
}
