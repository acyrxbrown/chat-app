"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { BlockedUser } from "@/lib/types";

export function BlockedContactsManager() {
  const [blocked, setBlocked] = useState<(BlockedUser & { profile?: { full_name: string | null; email: string | null } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const fetchBlocked = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) {
          setBlocked([]);
          setSignedIn(false);
        }
        setLoading(false);
        return;
      }
      if (!cancelled) setSignedIn(true);
      const { data, error } = await supabase
        .from("blocked_users")
        .select(`
          id,
          blocked_id,
          created_at
        `)
        .eq("blocker_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fetch blocked failed:", error);
        setLoading(false);
        return;
      }

      if (!data?.length || cancelled) {
        if (!cancelled) setBlocked([]);
        setLoading(false);
        return;
      }

      const blockedIds = data.map((r) => r.blocked_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", blockedIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      if (!cancelled) {
        setBlocked(
          data.map((r) => ({
            ...r,
            profile: profileMap.get(r.blocked_id) ?? undefined,
          })) as (BlockedUser & { profile?: { full_name: string | null; email: string | null } })[]
        );
      }
      setLoading(false);
    };
    fetchBlocked();
    return () => { cancelled = true; };
  }, []);

  const handleUnblock = async (blockedId: string) => {
    setUnblockingId(blockedId);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("blocked_users")
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_id", blockedId);

      if (error) throw error;
      setBlocked((prev) => prev.filter((b) => b.blocked_id !== blockedId));
    } catch (e) {
      console.error("Unblock failed:", e);
    } finally {
      setUnblockingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-slate-400 text-sm">Loading blocked contacts…</div>
    );
  }

  if (signedIn === false) {
    return (
      <div className="py-8 text-center text-slate-400 text-sm">
        Sign in to view and manage blocked contacts.
      </div>
    );
  }

  if (blocked.length === 0) {
    return (
      <div className="py-8 text-center text-slate-400 text-sm">
        You haven&apos;t blocked anyone. Blocked contacts cannot send you messages.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-700">
      {blocked.map((b) => (
        <li key={b.id} className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium text-white">
              {b.profile?.full_name || b.profile?.email || "Unknown"}
            </p>
            {b.profile?.full_name && b.profile?.email && (
              <p className="text-sm text-slate-400">{b.profile.email}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleUnblock(b.blocked_id)}
            disabled={unblockingId === b.blocked_id}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 disabled:opacity-50"
          >
            {unblockingId === b.blocked_id ? "Unblocking…" : "Unblock"}
          </button>
        </li>
      ))}
    </ul>
  );
}
