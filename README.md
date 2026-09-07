# Converse Now

Build a polished web app called **Converso AI** with the tagline **"Talk naturally. Interrupt anytime."**

It is a generic browser-based AI voice assistant. The main goal is to make real-time voice interruption (barge-in) work reliably.

### Core flow

Microphone → Speech-to-Text → LLM → Text-to-Speech → Audio

The user speaks through the browser, the speech is transcribed, sent to an LLM, and the response is spoken back.

### Features

1. 🎤 Browser microphone with permission/error handling.

2. 📝 Speech-to-text with live/final transcript.

3. 🧠 LLM with streaming responses when supported.

4. 🔊 Text-to-speech with controllable audio playback.

5. ⚡ **Real-time interruption:** while the AI is speaking, if the user starts talking:

   - Stop audio immediately.

   - Clear queued audio.

   - Stop/cancel TTS.

   - Abort/cancel the active LLM request when possible.

   - Mark the response as interrupted.

   - Process the new speech and generate a new response.

6. 🛡️ Prevent old/cancelled responses from affecting the new response. Use request IDs, AbortController, or equivalent cancellation logic.

7. 🟢 **Live status indicator:** IDLE, LISTENING, TRANSCRIBING, THINKING, SPEAKING, INTERRUPTED, ERROR. Status must reflect the actual system state.

8. 🧠 Conversation memory so follow-up questions understand previous context.

9. ⏳ Handle short pauses/trailing-off. For example, if the user says "Can you explain how I can..." and pauses, wait briefly for continuation instead of immediately submitting an incomplete request.

10. 💬 Clean conversation transcript. Clearly mark interrupted responses.

### UI

Create a modern, minimal, premium-looking interface. The main screen should contain:

- Converso AI name/tagline

- Large current-status indicator

- Microphone/voice control

- Conversation transcript

- Subtle voice/waveform animation

Example statuses:

🟢 LISTENING

🔵 THINKING

🟣 SPEAKING

🟠 INTERRUPTED

⚪ IDLE

The status should visibly transition during conversation:

LISTENING → TRANSCRIBING → THINKING → SPEAKING

During interruption:

SPEAKING → INTERRUPTED → LISTENING → TRANSCRIBING → THINKING → SPEAKING

### Important

Do NOT fake interruption by only changing the UI. The actual audio must stop and the active request must be cancelled/aborted where supported. Late responses from cancelled requests must never play or overwrite the new response.

Use React + TypeScript and a clean modular architecture. Keep API keys in environment variables and never expose secrets in frontend code.

Do not add unnecessary features such as authentication, payments, dashboards, RAG, vector databases, tool calling, analytics, or complex settings.

### Test

After building, test this exact scenario:

Ask:

"Give me a detailed explanation of quantum computing."

While it is speaking, interrupt:

"Stop. What is 25 times 37?"

The quantum-computing response must stop immediately, the old request must be cancelled/invalidated, and the assistant must answer the new question.

Also test conversation memory:

"What is Python?" → "Who created it?"

And trailing-off:

"Can you explain how I can..." → pause → "...learn machine learning?"

Build the actual working application, not a static mockup.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5a56b616-96a9-4cf6-85e1-568236384814).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
