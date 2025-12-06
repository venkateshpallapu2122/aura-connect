import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export function useBlockedUsers(userId?: string) {
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadBlockedUsers = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("blocked_users")
        .select("blocked_id")
        .eq("blocker_id", userId);

      if (error) throw error;

      setBlockedUsers(data?.map((b) => b.blocked_id) || []);
    } catch (error) {
      console.error("Error loading blocked users:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadBlockedUsers();
  }, [loadBlockedUsers]);

  const blockUser = async (blockedId: string) => {
    if (!userId) return false;

    try {
      const { error } = await supabase.from("blocked_users").insert({
        blocker_id: userId,
        blocked_id: blockedId,
      });

      if (error) throw error;

      setBlockedUsers((prev) => [...prev, blockedId]);
      toast({
        title: "User blocked",
        description: "You will no longer see messages from this user.",
      });
      return true;
    } catch (error) {
      console.error("Error blocking user:", error);
      toast({
        title: "Error",
        description: "Failed to block user. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const unblockUser = async (blockedId: string) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from("blocked_users")
        .delete()
        .eq("blocker_id", userId)
        .eq("blocked_id", blockedId);

      if (error) throw error;

      setBlockedUsers((prev) => prev.filter((id) => id !== blockedId));
      toast({
        title: "User unblocked",
        description: "You can now see messages from this user again.",
      });
      return true;
    } catch (error) {
      console.error("Error unblocking user:", error);
      toast({
        title: "Error",
        description: "Failed to unblock user. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const isBlocked = useCallback(
    (checkUserId: string) => {
      return blockedUsers.includes(checkUserId);
    },
    [blockedUsers]
  );

  return { blockedUsers, blockUser, unblockUser, isBlocked, loading, refetch: loadBlockedUsers };
}
