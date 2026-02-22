"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { parseDiffussedMessage, DIFFUSSION_PHOTO, DIFFUSSION_VIDEO } from "@/lib/diffusion";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { VoiceMessageBubble } from "@/components/VoiceMessageBubble";

type MessagePart =
  | { kind: "user"; content: string; diffussed?: boolean }
  | { kind: "voice"; audioDataUrl: string; durationSeconds: number; fromUser: boolean }
  | { kind: "assistant"; content: string }
  | {
      kind: "diffussed";
      userContent: string;
      prompt: string;
      type: "photo" | "video";
      text?: string;
      imageBase64?: string;
      videoUri?: string;
    };

export default function ChatPage() {
  const [messages, setMessages] = useState<MessagePart[]>([
    {
      kind: "assistant",
      content:
        "Hi! You can chat with me, send a voice note with the mic button, or tag @diffussion-photo / @diffussion-video for AI images. Try: \"A cozy coffee shop @diffussion-photo\"",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);
    setError(null);

    const { isDiffussed, type, prompt, displayText } = parseDiffussedMessage(text);

    if (isDiffussed && type) {
      setMessages((m) => [
        ...m,
        {
          kind: "diffussed",
          userContent: displayText,
          prompt,
          type,
          text: undefined,
          imageBase64: undefined,
          videoUri: undefined,
        },
      ]);
      scrollToBottom();

      try {
        const res = await fetch("/api/diffusion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, type }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.error || res.statusText);
        }

        setMessages((m) => {
          const next = [...m];
          const idx = next.length - 1;
          if (next[idx]?.kind === "diffussed") {
            next[idx] = {
              ...next[idx],
              kind: "diffussed",
              text: data.text,
              imageBase64: data.imageBase64,
              videoUri: data.videoUri,
            };
          }
          return next;
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Generation failed");
        setMessages((m) => {
          const next = [...m];
          const idx = next.length - 1;
          if (next[idx]?.kind === "diffussed") {
            next[idx] = {
              ...next[idx],
              kind: "diffussed",
              text: `Failed: ${e instanceof Error ? e.message : "Unknown error"}`,
            };
          }
          return next;
        });
      }
    } else {
      setMessages((m) => [...m, { kind: "user", content: text }]);
      scrollToBottom();

      try {
        const history = [...messages, { kind: "user" as const, content: text }]
          .filter((x) => x.kind === "user" || x.kind === "assistant")
          .map((x) => ({
            role: x.kind === "user" ? "user" : "assistant",
            content: x.kind === "user" ? x.content : (x as { content: string }).content,
          }));

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || res.statusText);
        }

        const { message } = await res.json();
        setMessages((m) => [...m, { kind: "assistant", content: message }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Chat failed");
      }
    }

    setLoading(false);
    scrollToBottom();
  }, [input, loading, messages, scrollToBottom]);

  const handleVoiceComplete = useCallback(
    (audioDataUrl: string, durationSeconds: number) => {
      setMessages((m) => [
        ...m,
        { kind: "voice", audioDataUrl, durationSeconds, fromUser: true },
      ]);
      scrollToBottom();
    },
    [scrollToBottom]
  );

  return (
    <div className="min-h-screen max-w-2xl mx-auto flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 bg-slate-900/50 shrink-0">
        <Link
          href="/"
          className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white">Chat</p>
          <p className="text-slate-400 text-xs">
            Voice notes · Tag {DIFFUSSION_PHOTO} or {DIFFUSSION_VIDEO}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((m, i) => {
          if (m.kind === "voice") {
            return (
              <div
                key={i}
                className={`flex gap-3 ${m.fromUser ? "flex-row-reverse" : ""}`}
              >
                <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <VoiceMessageBubble
                  audioDataUrl={m.audioDataUrl}
                  durationSeconds={m.durationSeconds}
                  isFromUser={m.fromUser}
                />
              </div>
            );
          }

          if (m.kind === "user") {
            return (
              <div key={i} className="flex justify-end gap-3">
                <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-blue-600 text-white">
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            );
          }

          if (m.kind === "assistant") {
            return (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-slate-700/80 text-slate-100">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
              </div>
            );
          }

          if (m.kind === "diffussed") {
            return (
              <div key={i} className="space-y-2">
                <div className="flex justify-end gap-3">
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-blue-600 text-white">
                    <p className="text-sm whitespace-pre-wrap">{m.userContent}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">
                      {m.type === "photo" ? "🖼" : "🎬"}
                    </span>
                  </div>
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-slate-700/80 text-slate-100 space-y-2">
                    {!m.imageBase64 && !m.videoUri && !m.text && (
                      <p className="text-sm text-slate-400 animate-pulse">
                        Generating{m.type === "photo" ? " image" : " video"}…
                      </p>
                    )}
                    {m.imageBase64 && (
                      <img
                        src={`data:image/png;base64,${m.imageBase64}`}
                        alt={m.prompt}
                        className="rounded-lg max-w-full max-h-80 object-cover"
                      />
                    )}
                    {m.videoUri && (
                      <video
                        src={m.videoUri}
                        controls
                        className="rounded-lg max-w-full max-h-80"
                      />
                    )}
                    {m.text && (
                      <p className="text-sm text-slate-300">{m.text}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          return null;
        })}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center shrink-0 animate-pulse" />
            <div className="rounded-2xl px-4 py-3 bg-slate-700/80 text-slate-400 text-sm">
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="px-4 py-2 text-red-400 text-sm text-center">{error}</p>
      )}

      <div className="p-4 border-t border-slate-700 shrink-0">
        <div className="flex items-center gap-2 rounded-2xl bg-slate-800 border border-slate-700 px-3 py-2">
          <VoiceRecorder
            onRecordingComplete={handleVoiceComplete}
            disabled={loading}
          />
          <input
            type="text"
            placeholder="Message or prompt… Use @diffussion-photo or @diffussion-video"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm py-2"
          />
          <button
            type="button"
            onClick={send}
            disabled={loading || !input.trim()}
            className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white disabled:opacity-50"
            aria-label="Send"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
