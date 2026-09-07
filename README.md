Converso AI
Talk naturally. Interrupt anytime.

Converso AI is a browser-based real-time voice assistant designed for natural, conversational interaction.

The key feature is real-time interruption (barge-in) — users can interrupt the AI while it is speaking, causing the current response to stop so the assistant can immediately process the new request.

🚀 Features
🎤 Browser-based microphone input
📝 Speech-to-text transcription
🧠 LLM-powered responses
🔊 Text-to-speech responses
⚡ Real-time voice interruption (barge-in)
🛑 Immediate audio stopping when interrupted
🔄 Cancellation/invalidation of previous requests
🛡️ Protection against stale responses after interruption
🟢 Live conversation status
🧠 Conversation memory for follow-up questions
⏳ Short-pause/trailing-off handling
💬 Conversation transcript
⌨️ Text input fallback
Live Status States

The interface provides real-time feedback using these states:

IDLE
LISTENING
TRANSCRIBING
THINKING
SPEAKING
INTERRUPTED
ERROR
💡 What Makes Converso AI Different?

Traditional voice assistants often require users to wait until the assistant finishes speaking.

Converso AI treats interruption as a core part of the conversation.

AI SPEAKING
↓
USER INTERRUPTS
↓
AUDIO STOPS
↓
OLD RESPONSE IS CANCELLED / INVALIDATED
↓
NEW INPUT IS PROCESSED
↓
AI RESPONDS TO THE NEW QUESTION

The system does not simply change the interface when an interruption occurs. It stops the current audio playback and prevents responses from an older request from interfering with the new conversation.

🏗️ How It Works

The main voice pipeline is:

Microphone
↓
Speech-to-Text
↓
Conversation Context
↓
LLM
↓
Text-to-Speech
↓
Audio Playback

When an interruption occurs:

SPEAKING
↓
Interruption Detected
↓
Stop Audio + Clear Queued Audio
↓
Cancel / Invalidate Previous Request
↓
Process New Speech
↓
Generate New Response
↓
SPEAKING

Request cancellation and request identification are used to prevent stale responses from a previous conversation turn from playing after a newer request has started.

🛠️ Tech Stack
React
TypeScript
Vite
Browser Web APIs
Speech-to-Text
Text-to-Speech
LLM API
📦 Running Locally

Clone the repository:

git clone https://github.com/qusai52/converse-now.git
cd converse-now

Install dependencies:

npm install

Create the required environment configuration:

.env

Add the API configuration required by the application.

Then start the development server:

npm run dev

Open the local URL provided by the development server in your browser.

🔐 Environment Variables

API keys and other secrets should be stored in environment variables and should never be committed to the repository.

The required environment variables depend on the external services configured for the current application.

🧪 Demo Test
Test 1 — Real-Time Interruption

Ask:

"Give me a detailed explanation of quantum computing."

While the assistant is speaking, interrupt it with:

"Stop. What is 25 times 37?"

Expected behavior:

The current audio stops immediately.
The previous response is marked as interrupted.
The previous request is cancelled or invalidated.
The new speech is processed.
The assistant answers the new question.

Expected answer:

"925."

Test 2 — Conversation Memory

Ask:

"What is Python?"

Then ask:

"Who created it?"

The second question should use the context from the previous conversation.

Test 3 — Trailing-Off

Say:

"Can you explain how I can..."

Pause briefly, then continue:

"...learn machine learning?"

The assistant should wait briefly for the continuation instead of immediately submitting an incomplete request.

🎯 Project Goal

The goal of Converso AI is to make voice-based AI interaction feel more natural by allowing users to speak, pause, ask follow-up questions, and interrupt the assistant without having to wait for it to finish.

The project focuses particularly on real-time interruption handling, request cancellation, audio control, and conversational context.

📄 Project Status

Converso AI was developed as a competition project demonstrating a real-time, interruptible browser-based AI voice assistant.

The application is designed to be tested directly through the deployed web application and can also be run locally from the source repository.

👤 Project

Converso AI

Tagline: Talk naturally. Interrupt anytime.
