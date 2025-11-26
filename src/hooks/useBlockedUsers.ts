import { useState, useEffect } from "react";

export function useBlockedUsers() {
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("blocked_users");
    if (stored) {
      setBlockedUsers(JSON.parse(stored));
    }
  }, []);

  const blockUser = (userId: string) => {
    const newBlocked = [...blockedUsers, userId];
    setBlockedUsers(newBlocked);
    localStorage.setItem("blocked_users", JSON.stringify(newBlocked));
  };

  const unblockUser = (userId: string) => {
    const newBlocked = blockedUsers.filter((id) => id !== userId);
    setBlockedUsers(newBlocked);
    localStorage.setItem("blocked_users", JSON.stringify(newBlocked));
  };

  const isBlocked = (userId: string) => {
    return blockedUsers.includes(userId);
  };

  return { blockedUsers, blockUser, unblockUser, isBlocked };
}
