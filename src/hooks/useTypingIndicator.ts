import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface TypingState {
  user_id: string;
  username: string;
  isTyping: boolean;
}

export const useTypingIndicator = (conversationId: string | null, userId: string) => {
  const [typingUsers, setTypingUsers] = useState<Record<string, TypingState>>({});
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    const typingChannel = supabase.channel(`typing:${conversationId}`);

    typingChannel
      .on("presence", { event: "sync" }, () => {
        const state = typingChannel.presenceState();
        const typingState: Record<string, TypingState> = {};

        Object.keys(state).forEach((key) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const presences = state[key] as any[];
          if (presences.length > 0) {
            const presence = presences[0] as TypingState;
            if (presence.user_id !== userId && presence.isTyping) {
              typingState[presence.user_id] = presence;
            }
          }
        });

        setTypingUsers(typingState);
      })
      .subscribe();

    setChannel(typingChannel);

    return () => {
      supabase.removeChannel(typingChannel);
    };
  }, [conversationId, userId]);

  const setTyping = async (isTyping: boolean, username: string) => {
    if (!channel || !conversationId) return;

    await channel.track({
      user_id: userId,
      username,
      isTyping,
    });
  };

  return { typingUsers, setTyping };
};
