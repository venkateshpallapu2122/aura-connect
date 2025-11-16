import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface ScheduledMessage {
  id: string;
  content: string;
  scheduled_time: string;
  sent: boolean;
}

interface ScheduledMessagesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  userId: string;
}

const ScheduledMessages = ({
  open,
  onOpenChange,
  conversationId,
  userId,
}: ScheduledMessagesProps) => {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadScheduledMessages();
      
      // Set up realtime subscription
      const channel = supabase
        .channel("scheduled-messages")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "scheduled_messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          () => {
            loadScheduledMessages();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, conversationId]);

  const loadScheduledMessages = async () => {
    const { data } = await supabase
      .from("scheduled_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("sender_id", userId)
      .eq("sent", false)
      .order("scheduled_time", { ascending: true });

    if (data) {
      setMessages(data);
    }
  };

  const handleSchedule = async () => {
    if (!newMessage.trim() || !scheduledTime) {
      toast({
        title: "Missing information",
        description: "Please enter a message and select a time",
        variant: "destructive",
      });
      return;
    }

    const scheduleDate = new Date(scheduledTime);
    if (scheduleDate <= new Date()) {
      toast({
        title: "Invalid time",
        description: "Please select a future time",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("scheduled_messages").insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: newMessage,
        scheduled_time: scheduleDate.toISOString(),
      });

      if (error) throw error;

      toast({
        title: "Message scheduled",
        description: `Will be sent at ${format(scheduleDate, "PPp")}`,
      });

      setNewMessage("");
      setScheduledTime("");
      loadScheduledMessages();
    } catch (error) {
      console.error("Error scheduling message:", error);
      toast({
        title: "Error",
        description: "Failed to schedule message",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("scheduled_messages")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Scheduled message removed",
      });

      loadScheduledMessages();
    } catch (error) {
      console.error("Error deleting scheduled message:", error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Scheduled Messages
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Message</Label>
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Schedule Time</Label>
            <Input
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          <Button
            onClick={handleSchedule}
            disabled={loading}
            className="w-full"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Message
          </Button>

          <div>
            <Label className="mb-2 block">Pending Messages</Label>
            <ScrollArea className="h-[200px] border rounded-lg">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No scheduled messages
                </p>
              ) : (
                <div className="p-2 space-y-2">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="flex items-start gap-2 p-3 bg-secondary rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(msg.scheduled_time), "PPp")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(msg.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduledMessages;
