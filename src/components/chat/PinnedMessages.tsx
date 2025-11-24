import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Pin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface PinnedMessage {
  id: string;
  message_id: string;
  message?: {
    content: string;
    sender?: {
      username: string;
    };
  };
}

interface PinnedMessagesProps {
  conversationId: string;
  userId: string;
  onMessageClick: (messageId: string) => void;
}

const PinnedMessages = ({ conversationId, userId, onMessageClick }: PinnedMessagesProps) => {
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPinnedMessages();

    const channel = supabase
      .channel(`pinned:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pinned_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          loadPinnedMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const loadPinnedMessages = async () => {
    const { data } = await supabase
      .from("pinned_messages")
      .select(`
        id,
        message_id,
        message:messages(
          content,
          sender:profiles(username)
        )
      `)
      .eq("conversation_id", conversationId)
      .order("pinned_at", { ascending: false });

    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPinnedMessages(data as any);
    }
  };

  const unpinMessage = async (pinnedMessageId: string) => {
    try {
      const { error } = await supabase
        .from("pinned_messages")
        .delete()
        .eq("id", pinnedMessageId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Message unpinned",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  if (pinnedMessages.length === 0) return null;

  return (
    <div className="border-b border-border bg-secondary/30">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <Pin className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">
            {pinnedMessages.length} Pinned Message{pinnedMessages.length !== 1 ? 's' : ''}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Hide' : 'Show'}
        </Button>
      </div>

      {expanded && (
        <ScrollArea className="max-h-48">
          <div className="space-y-2 p-3 pt-0">
            {pinnedMessages.map((pinned) => (
              <div
                key={pinned.id}
                className="bg-background rounded-lg p-3 flex items-start gap-2 group hover:bg-secondary/50 transition-colors cursor-pointer"
                onClick={() => onMessageClick(pinned.message_id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-primary mb-1">
                    {pinned.message?.sender?.username}
                  </p>
                  <p className="text-sm truncate">
                    {pinned.message?.content}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    unpinMessage(pinned.id);
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default PinnedMessages;
