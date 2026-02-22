import Link from "next/link";
import { BlockedContactsManager } from "@/components/BlockedContactsManager";

export default function BlockedPage() {
  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-6">
      <header className="flex items-center gap-4 mb-6">
        <Link
          href="/"
          className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-white">Blocked contacts</h1>
          <p className="text-sm text-slate-400">Blocked users cannot send you messages</p>
        </div>
      </header>
      <BlockedContactsManager />
    </div>
  );
}
