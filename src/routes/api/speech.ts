import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/speech")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "Missing AI credentials" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        let text = "";
        try {
          const body = (await request.json()) as { text?: string };
          text = (body.text ?? "").trim();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid request body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (!text) {
          return new Response(JSON.stringify({ error: "No text provided" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "openai/gpt-4o-mini-tts",
              input: text.slice(0, 3000),
              voice: "alloy",
              instructions: "Speak in a warm, natural, conversational tone at a brisk pace.",
              stream_format: "sse",
              response_format: "pcm",
            }),
            signal: request.signal,
          });

          if (!upstream.ok || !upstream.body) {
            const detail = await upstream.text().catch(() => "");
            return new Response(
              JSON.stringify({ error: `Speech failed (${upstream.status}). ${detail.slice(0, 200)}` }),
              { status: upstream.status, headers: { "Content-Type": "application/json" } },
            );
          }

          return new Response(upstream.body, {
            headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
          });
        } catch (err) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          throw err;
        }
      },
    },
  },
});
