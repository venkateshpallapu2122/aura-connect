import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MessageRead {
  message_id: string;
  user_id: string;
  read_at: string;
}

export const useReadReceipts = (conversationId: string | null, userId: string) => {
  const [readReceipts, setReadReceipts] = useState<Record<string, MessageRead[]>>({});

  useEffect(() => {
    if (!conversationId) return;

    const loadReadReceipts = async () => {
      const { data: messages } = await supabase
        .from("messages")
        .select("id")
        .eq("conversation_id", conversationId);

      if (!messages) return;

      const messageIds = messages.map(m => m.id);
      const { data: reads } = await supabase
        .from("message_reads")
        .select("*")
        .in("message_id", messageIds);

      if (reads) {
        const grouped = reads.reduce((acc, read) => {
          if (!acc[read.message_id]) acc[read.message_id] = [];
          acc[read.message_id].push(read);
          return acc;
        }, {} as Record<string, MessageRead[]>);
        setReadReceipts(grouped);
      }
    };

    loadReadReceipts();

    const channel = supabase
      .channel(`read-receipts:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_reads",
        },
        (payload) => {
          const newRead = payload.new as MessageRead;
          setReadReceipts(prev => ({
            ...prev,
            [newRead.message_id]: [...(prev[newRead.message_id] || []), newRead],
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const markAsRead = async (messageId: string) => {
    try {
      await supabase.from("message_reads").insert({
        message_id: messageId,
        user_id: userId,
      });
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  return { readReceipts, markAsRead };
};
