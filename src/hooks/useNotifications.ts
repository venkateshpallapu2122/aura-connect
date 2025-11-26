import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useNotifications = (userId: string, currentConversationId: string | null) => {
  const { toast } = useToast();

  useEffect(() => {
    requestNotificationPermission();
    
    const channel = supabase
      .channel("new-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const message = payload.new as any;
          
          // Don't notify for own messages or messages in current conversation
          if (message.sender_id === userId || message.conversation_id === currentConversationId) {
            return;
          }

          // Get sender info
          const { data: sender } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", message.sender_id)
            .single();

          // Show browser notification
          if (Notification.permission === "granted") {
            new Notification(`New message from ${sender?.username || "Unknown"}`, {
              body: message.content.substring(0, 100),
              icon: "/placeholder.svg",
              tag: message.id,
            });
          }

          // Show in-app toast
          toast({
            title: `New message from ${sender?.username || "Unknown"}`,
            description: message.content.substring(0, 100),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, currentConversationId]);

  const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  return { requestNotificationPermission };
};
