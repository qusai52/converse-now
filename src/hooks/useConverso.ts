import { useCallback, useEffect, useRef, useState } from "react";
import { VoicePlayer } from "@/lib/voice-player";
import {
  getSpeechRecognition,
  soundsIncomplete,
  type SpeechRecognitionErrorEventLike,
  type SpeechRecognitionEventLike,
  type SpeechRecognitionLike,
} from "@/lib/speech-recognition";

export type Status =
  | "IDLE"
  | "LISTENING"
  | "TRANSCRIBING"
  | "THINKING"
  | "SPEAKING"
  | "INTERRUPTED"
  | "ERROR";

export type Turn = {
  id: string;
  role: "user" | "assistant";
  text: string;
  interrupted?: boolean;
  streaming?: boolean;
};

const PAUSE_MS = 1100;
const TRAILING_OFF_MS = 2400;
/** Mic loudness required to count as real user speech while the AI is talking. */
const BARGE_IN_LEVEL = 0.14;
/** Echo can still reach the recogniser shortly after playback ends. */
const ECHO_TAIL_MS = 700;

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

/** True when the transcript mostly repeats what the assistant just said aloud. */
function looksLikeEcho(text: string, spoken: Set<string>): boolean {
  const words = normalize(text);
  if (!words.length || spoken.size === 0) return false;
  let hits = 0;
  for (const w of words) if (spoken.has(w)) hits++;
  return hits / words.length >= 0.6;
}


export function useConverso() {
  const [status, setStatus] = useState<Status>("IDLE");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [level, setLevel] = useState(0);

  const playerRef = useRef<VoicePlayer | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const runIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const pendingRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef = useRef<Status>("IDLE");
  const activeRef = useRef(false);
  const historyRef = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const speakStartedAtRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const levelRef = useRef(0);
  const spokenWordsRef = useRef<Set<string>>(new Set());
  const speakEndedAtRef = useRef(0);


  const setStatusSafe = useCallback((s: Status) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const getPlayer = useCallback(() => {
    if (!playerRef.current) playerRef.current = new VoicePlayer();
    return playerRef.current;
  }, []);

  /** Cancels TTS audio + the in-flight LLM request and invalidates the run id. */
  const cancelCurrentTurn = useCallback(
    (markInterrupted: boolean) => {
      runIdRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
      playerRef.current?.stop();
      if (markInterrupted) {
        setTurns((prev) => {
          const next = [...prev];
          for (let i = next.length - 1; i >= 0; i--) {
            const turn = next[i];
            if (turn && turn.role === "assistant") {
              next[i] = { ...turn, interrupted: true, streaming: false };
              break;
            }
          }

          return next;
        });
      }
    },
    [],
  );

  const submit = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      // A new turn always cancels whatever is still speaking/streaming.
      if (statusRef.current === "SPEAKING" || statusRef.current === "THINKING") {
        cancelCurrentTurn(true);
      }

      runIdRef.current += 1;

      const runId = runIdRef.current;
      const controller = new AbortController();
      abortRef.current = controller;

      const userTurn: Turn = { id: `u${runId}`, role: "user", text: clean };
      const assistantTurn: Turn = { id: `a${runId}`, role: "assistant", text: "", streaming: true };
      setTurns((prev) => [...prev, userTurn, assistantTurn]);
      historyRef.current = [
        ...historyRef.current,
        { role: "user" as const, content: clean },
      ].slice(-20);

      setStatusSafe("THINKING");

      const player = getPlayer();
      spokenWordsRef.current = new Set();
      let spoken = "";
      let buffer = "";
      let full = "";


      const flush = (force = false) => {
        if (runId !== runIdRef.current) return;
        let chunk = "";
        if (force) {
          chunk = buffer;
          buffer = "";
        } else {
          const match = buffer.match(/^[\s\S]*?[.!?…](?=\s|$)/);
          if (match && match[0].trim().length > 8) {
            chunk = match[0];
            buffer = buffer.slice(match[0].length);
          } else if (buffer.length > 200) {
            const cut = buffer.lastIndexOf(" ", 180);
            chunk = buffer.slice(0, cut > 40 ? cut : 180);
            buffer = buffer.slice(chunk.length);
          }
        }
        if (chunk.trim()) {
          spoken += chunk;
          for (const w of normalize(chunk)) spokenWordsRef.current.add(w);
          player.enqueue(chunk);

          if (statusRef.current === "THINKING") {
            speakStartedAtRef.current = Date.now();
            setStatusSafe("SPEAKING");
          }
        }
      };

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: historyRef.current }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const info = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(info.error ?? `Request failed (${res.status})`);
        }

        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let sse = "";
        while (true) {
          if (runId !== runIdRef.current) {
            await reader.cancel().catch(() => {});
            return;
          }
          const { value, done } = await reader.read();
          if (done) break;
          sse += value;
          const lines = sse.split("\n");
          sse = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            let evt: { choices?: { delta?: { content?: string } }[] };
            try {
              evt = JSON.parse(payload);
            } catch {
              continue;
            }
            const delta = evt.choices?.[0]?.delta?.content;
            if (!delta) continue;
            full += delta;
            buffer += delta;
            if (runId !== runIdRef.current) return;
            setTurns((prev) =>
              prev.map((t) => (t.id === assistantTurn.id ? { ...t, text: full } : t)),
            );
            flush();
          }
        }

        if (runId !== runIdRef.current) return;
        flush(true);
        void spoken;
        historyRef.current = [
          ...historyRef.current,
          { role: "assistant" as const, content: full },
        ].slice(-20);
        setTurns((prev) =>
          prev.map((t) => (t.id === assistantTurn.id ? { ...t, streaming: false } : t)),
        );
        if (statusRef.current === "THINKING") setStatusSafe("SPEAKING");
        speakStartedAtRef.current = speakStartedAtRef.current || Date.now();
      } catch (err) {
        if (runId !== runIdRef.current) return;
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message);
        setStatusSafe("ERROR");
        setTurns((prev) => prev.filter((t) => t.id !== assistantTurn.id));
        setTimeout(() => {
          if (activeRef.current && statusRef.current === "ERROR") setStatusSafe("LISTENING");
        }, 2500);
      }
    },
    [cancelCurrentTurn, getPlayer, setStatusSafe],
  );

  const scheduleSubmit = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const text = pendingRef.current.trim();
    if (!text) return;
    const delay = soundsIncomplete(text) ? TRAILING_OFF_MS : PAUSE_MS;
    timerRef.current = setTimeout(() => {
      const finalText = pendingRef.current.trim();
      pendingRef.current = "";
      setInterim("");
      if (finalText) void submit(finalText);
    }, delay);
  }, [submit]);

  const handleUserSpeech = useCallback(
    (text: string, isFinal: boolean) => {
      const s = statusRef.current;
      const meaningful = text.trim().length >= 2;
      const speakingLongEnough = Date.now() - speakStartedAtRef.current > 500;

      if (meaningful && (s === "SPEAKING" || s === "THINKING")) {
        if (s === "SPEAKING" && !speakingLongEnough) return;
        cancelCurrentTurn(true);
        setStatusSafe("INTERRUPTED");
        setTimeout(() => {
          if (activeRef.current && statusRef.current === "INTERRUPTED") setStatusSafe("LISTENING");
        }, 550);
      }

      if (isFinal) {
        pendingRef.current = `${pendingRef.current} ${text}`.trim();
        setInterim("");
        setStatusSafe("TRANSCRIBING");
        scheduleSubmit();
      } else {
        setInterim(text);
        if (timerRef.current) clearTimeout(timerRef.current);
        if (statusRef.current === "LISTENING" || statusRef.current === "IDLE") {
          setStatusSafe("LISTENING");
        }
      }
    },
    [cancelCurrentTurn, scheduleSubmit, setStatusSafe],
  );

  /** Poll for when queued speech finishes so status returns to LISTENING. */
  useEffect(() => {
    const id = setInterval(() => {
      if (statusRef.current === "SPEAKING" && !playerRef.current?.busy) {
        if (activeRef.current) setStatusSafe("LISTENING");
        else setStatusSafe("IDLE");
      }
    }, 200);
    return () => clearInterval(id);
  }, [setStatusSafe]);

  const stopSession = useCallback(() => {
    activeRef.current = false;
    setActive(false);
    cancelCurrentTurn(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    pendingRef.current = "";
    setInterim("");
    try {
      recognitionRef.current?.abort();
    } catch {
      /* noop */
    }
    recognitionRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setLevel(0);
    setStatusSafe("IDLE");
  }, [cancelCurrentTurn, setStatusSafe]);

  const startSession = useCallback(async () => {
    setError(null);
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      setError("This browser doesn't support live speech recognition. Try Chrome or Edge.");
      setStatusSafe("ERROR");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      // Simple level meter for the waveform visual.
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const meterCtx = new Ctor();
      const src = meterCtx.createMediaStreamSource(stream);
      const analyser = meterCtx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = ((data[i] ?? 128) - 128) / 128;
          sum += v * v;
        }
        setLevel(Math.min(1, Math.sqrt(sum / data.length) * 4));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      setError("Microphone access was blocked. Allow it in your browser and try again.");
      setStatusSafe("ERROR");
      return;
    }

    await getPlayer().unlock();

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        const transcript = result[0]?.transcript ?? "";
        if (!transcript.trim()) continue;
        handleUserSpeech(transcript, result.isFinal);
      }
    };
    recognition.onerror = (e: SpeechRecognitionErrorEventLike) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Microphone permission denied.");
        setStatusSafe("ERROR");
        activeRef.current = false;
        setActive(false);
      }
    };
    recognition.onend = () => {
      if (activeRef.current) {
        try {
          recognition.start();
        } catch {
          /* already starting */
        }
      }
    };

    recognitionRef.current = recognition;
    activeRef.current = true;
    setActive(true);
    try {
      recognition.start();
    } catch {
      /* already started */
    }
    setStatusSafe("LISTENING");
  }, [getPlayer, handleUserSpeech, setStatusSafe]);

  const interruptNow = useCallback(() => {
    if (statusRef.current === "SPEAKING" || statusRef.current === "THINKING") {
      cancelCurrentTurn(true);
      setStatusSafe("INTERRUPTED");
      setTimeout(() => {
        if (statusRef.current === "INTERRUPTED") {
          setStatusSafe(activeRef.current ? "LISTENING" : "IDLE");
        }
      }, 500);
    }
  }, [cancelCurrentTurn, setStatusSafe]);

  const clearConversation = useCallback(() => {
    cancelCurrentTurn(false);
    historyRef.current = [];
    setTurns([]);
    setInterim("");
    setStatusSafe(activeRef.current ? "LISTENING" : "IDLE");
  }, [cancelCurrentTurn, setStatusSafe]);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      abortRef.current?.abort();
      playerRef.current?.dispose();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return {
    status,
    turns,
    interim,
    error,
    active,
    level,
    startSession,
    stopSession,
    interruptNow,
    clearConversation,
    sendText: submit,
  };
}
