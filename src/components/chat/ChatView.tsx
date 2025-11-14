import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Smile, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import MediaUpload from "./MediaUpload";

interface ChatViewProps {
  userId: string;
  conversationId: string | null;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  type?: string;
  media_url?: string | null;
  sender?: {
    username: string;
    avatar_url: string | null;
  };
}

const ChatView = ({ userId, conversationId }: ChatViewProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState<any>(null);
  const [currentUsername, setCurrentUsername] = useState("");
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { typingUsers, setTyping } = useTypingIndicator(conversationId, userId);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!conversationId) return;

    loadMessages();
    loadOtherUser();
    loadCurrentUser();

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          loadSenderProfile(payload.new as Message);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!conversationId) return;

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (data) {
      // Load sender profiles for all messages
      const messagesWithProfiles = await Promise.all(
        data.map(async (msg) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", msg.sender_id)
            .single();

          return {
            ...msg,
            sender: profile,
          };
        })
      );
      setMessages(messagesWithProfiles);
    }
  };

  const loadSenderProfile = async (message: Message) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", message.sender_id)
      .single();

    setMessages((prev) => [...prev, { ...message, sender: profile }]);
  };

  const loadCurrentUser = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single();

    if (data) {
      setCurrentUsername(data.username);
    }
  };

  const loadOtherUser = async () => {
    if (!conversationId) return;

    const { data: participants } = await supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .neq("user_id", userId);

    if (participants && participants.length > 0) {
      const { data: user } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", participants[0].user_id)
        .single();

      setOtherUser(user);
    }
  };

  const handleTyping = () => {
    setTyping(true, currentUsername);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false, currentUsername);
    }, 2000);
  };

  const sendMessage = async (e: React.FormEvent, mediaUrl?: string, mediaType?: "image" | "file") => {
    e.preventDefault();
    if ((!newMessage.trim() && !mediaUrl) || !conversationId) return;

    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: mediaUrl ? (mediaType === "image" ? "📷 Image" : "📎 File") : newMessage.trim(),
        type: mediaUrl ? (mediaType === "image" ? "image" : "file") : "text",
        media_url: mediaUrl,
      });

      if (error) throw error;

      setNewMessage("");
      setShowEmojiPicker(false);
      setTyping(false, currentUsername);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleMediaUploaded = (url: string, type: "image" | "file") => {
    sendMessage(new Event("submit") as any, url, type);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const addEmoji = (emoji: any) => {
    setNewMessage((prev) => prev + emoji.native);
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <MessageCircle className="w-24 h-24 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-semibold mb-2">Select a chat</h2>
          <p className="text-muted-foreground">Choose a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b border-border bg-chat-header">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar>
              <AvatarImage src={otherUser?.avatar_url || undefined} />
              <AvatarFallback className="gradient-primary text-white">
                {otherUser?.username?.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            {otherUser?.is_online && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-status-online rounded-full border-2 border-chat-header" />
            )}
          </div>
          <div>
            <h2 className="font-semibold">{otherUser?.username || "Loading..."}</h2>
            <p className="text-sm text-muted-foreground">
              {Object.keys(typingUsers).length > 0
                ? "typing..."
                : otherUser?.is_online
                ? "Online"
                : "Offline"}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const isOwn = message.sender_id === userId;
            return (
              <div
                key={message.id}
                className={`flex items-start gap-2 animate-in ${
                  isOwn ? "flex-row-reverse" : ""
                }`}
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={message.sender?.avatar_url || undefined} />
                  <AvatarFallback className="gradient-primary text-white text-xs">
                    {message.sender?.username?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                    isOwn
                      ? "bg-chat-bubble-sent text-chat-bubble-sent-foreground"
                      : "bg-chat-bubble-received text-chat-bubble-received-foreground"
                  }`}
                >
                  {message.type === "image" && message.media_url ? (
                    <img
                      src={message.media_url}
                      alt="Shared media"
                      className="rounded-lg max-w-full mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(message.media_url, "_blank")}
                    />
                  ) : message.type === "file" && message.media_url ? (
                    <a
                      href={message.media_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm underline hover:opacity-80"
                    >
                      📎 {message.content}
                    </a>
                  ) : (
                    <p className="break-words">{message.content}</p>
                  )}
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-border bg-chat-header space-y-2">
        <MediaUpload onMediaUploaded={handleMediaUploaded} userId={userId} />
        <form onSubmit={(e) => sendMessage(e)} className="flex items-center gap-2">
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="hover:bg-secondary"
              >
                <Smile className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 border-0" side="top">
              <Picker data={data} onEmojiSelect={addEmoji} theme="light" />
            </PopoverContent>
          </Popover>
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            className="gradient-primary text-white"
            disabled={!newMessage.trim()}
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatView;
