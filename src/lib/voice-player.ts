/**
 * Streaming PCM audio player for text-to-speech.
 *
 * Real cancellation: stop() aborts every in-flight TTS fetch, stops all
 * scheduled AudioBufferSourceNodes and clears the queue. A generation token
 * guarantees audio belonging to a cancelled turn can never be scheduled.
 */
const SAMPLE_RATE = 24000;

export class VoicePlayer {
  private ctx: AudioContext | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private controllers = new Set<AbortController>();
  private chain: Promise<void> = Promise.resolve();
  private playhead = 0;
  private token = 0;
  private endsAt = 0;
  private pendingCount = 0;

  /** True while audio is scheduled/queued for playback. */
  get busy(): boolean {
    const now = this.ctx?.currentTime ?? 0;
    return this.pendingCount > 0 || this.endsAt > now;
  }

  private ensureContext(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor({ sampleRate: SAMPLE_RATE });
      this.playhead = 0;
      this.endsAt = 0;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  async unlock(): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx.state === "suspended") await ctx.resume().catch(() => {});
  }

  /** Queue a chunk of text; it plays after everything already queued. */
  enqueue(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    const myToken = this.token;
    this.pendingCount += 1;
    this.chain = this.chain
      .then(async () => {
        if (myToken !== this.token) return;
        await this.stream(trimmed, myToken);
      })
      .catch(() => {})
      .finally(() => {
        this.pendingCount = Math.max(0, this.pendingCount - 1);
      });
  }

  private async stream(text: string, myToken: number): Promise<void> {
    const controller = new AbortController();
    this.controllers.add(controller);
    try {
      const res = await fetch("/api/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(`TTS ${res.status}`);

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      let carry = new Uint8Array(0);

      while (true) {
        if (myToken !== this.token) {
          await reader.cancel().catch(() => {});
          return;
        }
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          let evt: { type?: string; audio?: string };
          try {
            evt = JSON.parse(payload);
          } catch {
            continue;
          }
          if (evt.type !== "speech.audio.delta" || !evt.audio) continue;
          const bin = atob(evt.audio);
          const incoming = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) incoming[i] = bin.charCodeAt(i);
          const merged = new Uint8Array(carry.length + incoming.length);
          merged.set(carry);
          merged.set(incoming, carry.length);
          const usable = merged.length - (merged.length % 2);
          carry = merged.slice(usable);
          if (usable > 0) this.schedule(merged.buffer.slice(0, usable), myToken);
        }
      }
    } finally {
      this.controllers.delete(controller);
    }
  }

  private schedule(pcm: ArrayBuffer, myToken: number): void {
    if (myToken !== this.token) return;
    const ctx = this.ensureContext();
    const samples = new Int16Array(pcm);
    if (samples.length === 0) return;
    const floats = Float32Array.from(samples, (s) => s / 32768);
    const buffer = ctx.createBuffer(1, floats.length, SAMPLE_RATE);
    buffer.copyToChannel(floats, 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    if (this.playhead < ctx.currentTime + 0.05) this.playhead = ctx.currentTime + 0.08;
    source.start(this.playhead);
    this.playhead += buffer.duration;
    this.endsAt = this.playhead;
    this.sources.add(source);
    source.onended = () => this.sources.delete(source);
  }

  /** Hard stop: cancels fetches, kills scheduled audio, clears the queue. */
  stop(): void {
    this.token += 1;
    this.pendingCount = 0;
    for (const c of this.controllers) c.abort();
    this.controllers.clear();
    for (const s of this.sources) {
      try {
        s.onended = null;
        s.stop();
        s.disconnect();
      } catch {
        /* already stopped */
      }
    }
    this.sources.clear();
    this.chain = Promise.resolve();
    this.playhead = this.ctx?.currentTime ?? 0;
    this.endsAt = 0;
  }

  dispose(): void {
    this.stop();
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}
