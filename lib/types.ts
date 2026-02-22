export type BlockedUser = {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  profiles?: { full_name: string | null; email: string | null; avatar_url: string | null };
};
