import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Conversation {
  id: string;
  name: string | null;
  avatar_url: string | null;
  type: string;
}

interface MessageForwardProps {
  messageId: string;
  messageContent: string;
  mediaUrl?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentConversationId: string;
}

const MessageForward = ({
  messageId,
  messageContent,
  mediaUrl,
  open,
  onOpenChange,
  currentConversationId,
}: MessageForwardProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversations, setSelectedConversations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [forwarding, setForwarding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadConversations();
    }
  }, [open]);

  const loadConversations = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const { data, error } = await supabase
      .from("conversation_participants")
      .select(`
        conversation_id,
        conversations (
          id,
          name,
          avatar_url,
          type
        )
      `)
      .eq("user_id", user.id)
      .neq("conversation_id", currentConversationId);

    if (data && !error) {
      const convs = data
        .map((p: any) => p.conversations)
        .filter((c: any) => c !== null);
      setConversations(convs);
    }
    setLoading(false);
  };

  const handleForward = async () => {
    if (selectedConversations.length === 0) return;

    setForwarding(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    try {
      const messages = selectedConversations.map((conversationId) => ({
        conversation_id: conversationId,
        sender_id: user.id,
        content: messageContent,
        media_url: mediaUrl,
        type: mediaUrl ? "media" : "text",
      }));

      const { error } = await supabase.from("messages").insert(messages);

      if (error) throw error;

      toast({
        title: "Message forwarded",
        description: `Forwarded to ${selectedConversations.length} conversation(s)`,
      });

      onOpenChange(false);
      setSelectedConversations([]);
    } catch (error) {
      console.error("Error forwarding message:", error);
      toast({
        title: "Error",
        description: "Failed to forward message",
        variant: "destructive",
      });
    } finally {
      setForwarding(false);
    }
  };

  const toggleConversation = (id: string) => {
    setSelectedConversations((prev) =>
      prev.includes(id)
        ? prev.filter((convId) => convId !== id)
        : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Forward Message</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No other conversations available
                </p>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => toggleConversation(conv.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      selectedConversations.includes(conv.id)
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-secondary hover:bg-secondary/80 border-2 border-transparent"
                    }`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conv.avatar_url || undefined} />
                      <AvatarFallback>
                        {conv.name?.[0]?.toUpperCase() || "C"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">
                        {conv.name || "Unnamed"}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {conv.type}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={forwarding}
          >
            Cancel
          </Button>
          <Button
            onClick={handleForward}
            disabled={selectedConversations.length === 0 || forwarding}
          >
            {forwarding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Forward ({selectedConversations.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MessageForward;
