"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

type BlockUserButtonProps = {
  /** User ID to block (the contact you want to block) */
  userId: string;
  /** Display name for confirm dialog */
  displayName?: string;
  /** Callback after successful block */
  onBlocked?: () => void;
  /** Variant: 'menu' for dropdown item, 'button' for standalone */
  variant?: "menu" | "button";
};

export function BlockUserButton({ userId, displayName, onBlocked, variant = "button" }: BlockUserButtonProps) {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleBlock = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be signed in to block contacts");
      }
      const { error } = await supabase.from("blocked_users").insert({
        blocker_id: user.id,
        blocked_id: userId,
      });

      if (error) throw error;
      setConfirmOpen(false);
      onBlocked?.();
    } catch (e) {
      console.error("Block failed:", e);
      // Could show toast - for now we just log
    } finally {
      setLoading(false);
    }
  };

  const label = "Block contact";
  const name = displayName || "this user";

  if (variant === "menu") {
    return (
      <>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="w-full px-4 py-2 text-left text-red-400 hover:bg-slate-700/50 rounded-lg text-sm"
        >
          {label}
        </button>
        {confirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full border border-slate-700">
              <p className="text-slate-200 mb-4">
                Block <span className="font-medium text-white">{name}</span>? They will not be able to send you
                messages.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBlock}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
                >
                  {loading ? "Blocking…" : "Block"}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={loading}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 text-sm font-medium disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
        {label}
      </button>
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full border border-slate-700">
            <p className="text-slate-200 mb-4">
              Block <span className="font-medium text-white">{name}</span>? They will not be able to send you
              messages.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBlock}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
              >
                {loading ? "Blocking…" : "Block"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
