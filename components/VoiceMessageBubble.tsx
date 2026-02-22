"use client";

import { useRef, useState, useCallback } from "react";

type VoiceMessageBubbleProps = {
  audioDataUrl: string;
  durationSeconds: number;
  isFromUser?: boolean;
};

export function VoiceMessageBubble({
  audioDataUrl,
  durationSeconds,
  isFromUser = false,
}: VoiceMessageBubbleProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl min-w-[140px] max-w-[240px] ${
        isFromUser ? "bg-blue-600 text-white" : "bg-slate-700/80 text-slate-100"
      }`}
    >
      <button
        type="button"
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
          isFromUser ? "bg-blue-500 hover:bg-blue-400" : "bg-slate-600 hover:bg-slate-500"
        }`}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 ml-0.5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium opacity-90">Voice note</p>
        <p className="text-xs opacity-75 font-mono">{formatDuration(durationSeconds)}</p>
      </div>
      <audio
        ref={audioRef}
        src={audioDataUrl}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
    </div>
  );
}
