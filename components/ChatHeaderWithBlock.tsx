"use client";

import Link from "next/link";
import { BlockUserButton } from "./BlockUserButton";

type ChatHeaderWithBlockProps = {
  /** Other participant's user ID (for direct chat) */
  otherUserId: string;
  /** Display name for the chat/contact */
  displayName: string;
  /** Optional: link back to chat list */
  backHref?: string;
};

/**
 * Example chat header with block option. Use this in ChatWindow or your chat UI.
 * In a dropdown menu, use BlockUserButton with variant="menu".
 */
export function ChatHeaderWithBlock({ otherUserId, displayName, backHref = "/" }: ChatHeaderWithBlockProps) {
  return (
    <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 bg-slate-900/50">
      {backHref && (
        <Link
          href={backHref}
          className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white truncate">{displayName}</p>
        <p className="text-slate-400 text-xs">Direct message</p>
      </div>
      <div className="flex items-center gap-2">
        <BlockUserButton userId={otherUserId} displayName={displayName} variant="button" />
        <Link
          href="/blocked"
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Blocked contacts"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
