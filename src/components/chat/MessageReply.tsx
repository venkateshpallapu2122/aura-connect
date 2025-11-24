import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReplyToMessage {
  id: string;
  content: string;
  sender?: {
    username: string;
  };
}

interface MessageReplyProps {
  replyTo: ReplyToMessage | null;
  onCancel: () => void;
}

const MessageReply = ({ replyTo, onCancel }: MessageReplyProps) => {
  if (!replyTo) return null;

  return (
    <div className="border-l-4 border-primary bg-secondary/50 p-3 rounded flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-primary">
          Replying to {replyTo.sender?.username}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {replyTo.content}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={onCancel}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};

interface ReplyMessageDisplayProps {
  replyToId: string;
  onReplyClick: () => void;
}

export const ReplyMessageDisplay = ({ replyToId, onReplyClick }: ReplyMessageDisplayProps) => {
  const [replyMessage, setReplyMessage] = useState<ReplyToMessage | null>(null);

  useEffect(() => {
    const loadReplyMessage = async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, content, sender:profiles(username)")
        .eq("id", replyToId)
        .single();

      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setReplyMessage(data as any);
      }
    };

    loadReplyMessage();
  }, [replyToId]);

  if (!replyMessage) return null;

  return (
    <button
      onClick={onReplyClick}
      className="border-l-2 border-primary/50 pl-2 mb-2 text-left hover:bg-secondary/50 rounded transition-colors w-full"
    >
      <p className="text-xs font-semibold text-primary/80">
        {replyMessage.sender?.username}
      </p>
      <p className="text-xs text-muted-foreground truncate">
        {replyMessage.content}
      </p>
    </button>
  );
};

export default MessageReply;
