import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Smile, MessageCircle, Search, Check, CheckCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useReadReceipts } from "@/hooks/useReadReceipts";
import { useNotifications } from "@/hooks/useNotifications";
import MediaUpload from "./MediaUpload";
import VoiceRecorder from "./VoiceRecorder";
import MessageSearch from "./MessageSearch";
import GroupChatHeader from "./GroupChatHeader";
import MessageReactions from "./MessageReactions";
import MessageActions from "./MessageActions";
import ChatExport from "./ChatExport";
import GroupVoiceChat from "./GroupVoiceChat";

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
  deleted_at?: string | null;
  is_edited?: boolean;
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
  const [conversationType, setConversationType] = useState<string>("direct");
  const [conversationName, setConversationName] = useState<string>("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { typingUsers, setTyping } = useTypingIndicator(conversationId, userId);
  const { readReceipts, markAsRead } = useReadReceipts(conversationId, userId);
  useNotifications(userId, conversationId);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!conversationId) return;

    loadMessages();
    loadOtherUser();
    loadCurrentUser();
    loadConversation();

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
    // Mark messages as read when viewing them
    messages.forEach((msg) => {
      if (msg.sender_id !== userId) {
        markAsRead(msg.id);
      }
    });
  }, [messages]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = messages.filter((msg) =>
        msg.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMessages(filtered);
    } else {
      setFilteredMessages(messages);
    }
  }, [searchQuery, messages]);

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

  const loadConversation = async () => {
    if (!conversationId) return;

    const { data } = await supabase
      .from("conversations")
      .select("type, name")
      .eq("id", conversationId)
      .single();

    if (data) {
      setConversationType(data.type);
      setConversationName(data.name || "");
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

  const sendMessage = async (e: React.FormEvent, mediaUrl?: string, mediaType?: "image" | "file" | "voice") => {
    e.preventDefault();
    if ((!newMessage.trim() && !mediaUrl) || !conversationId) return;

    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: mediaUrl 
          ? (mediaType === "image" ? "📷 Image" : mediaType === "voice" ? "🎤 Voice message" : "📎 File")
          : newMessage.trim(),
        type: mediaUrl ? mediaType : "text",
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

  const handleVoiceSent = (url: string) => {
    sendMessage(new Event("submit") as any, url, "voice");
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const regex = new RegExp(`(${highlight})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} className="bg-yellow-300 dark:bg-yellow-600">{part}</mark> : part
    );
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editingContent.trim()) return;

    try {
      // Get current message
      const { data: currentMessage } = await supabase
        .from("messages")
        .select("content")
        .eq("id", messageId)
        .single();

      if (currentMessage) {
        // Save edit history
        await supabase.from("message_edit_history").insert({
          message_id: messageId,
          previous_content: currentMessage.content,
          edited_by: userId,
        });

        // Update message
        await supabase
          .from("messages")
          .update({
            content: editingContent,
            is_edited: true,
          })
          .eq("id", messageId);

        setEditingMessageId(null);
        setEditingContent("");
        loadMessages();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await supabase
        .from("messages")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", messageId);

      loadMessages();
      
      toast({
        title: "Success",
        description: "Message deleted",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startEditingMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditingContent(content);
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
        <div className="flex items-center gap-3 flex-1">
          {conversationType === "group" ? (
            <GroupChatHeader
              conversationId={conversationId!}
              conversationName={conversationName}
              conversationType={conversationType}
              userId={userId}
            />
          ) : (
            <>
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
              <div className="flex-1">
                <h2 className="font-semibold">{otherUser?.username || "Loading..."}</h2>
                <p className="text-sm text-muted-foreground">
                  {Object.keys(typingUsers).length > 0
                    ? "typing..."
                    : otherUser?.is_online
                    ? "Online"
                    : "Offline"}
                </p>
              </div>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Search className="w-5 h-5" />
          </Button>
          {conversationId && <ChatExport conversationId={conversationId} />}
          {conversationType === "group" && (
            <GroupVoiceChat conversationId={conversationId!} userId={userId} />
          )}
        </div>
      </div>

      {showSearch && (
        <MessageSearch onSearch={handleSearch} onClose={() => { setShowSearch(false); setSearchQuery(""); }} />
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {filteredMessages.map((message) => {
            const isOwn = message.sender_id === userId;
            const messageReads = readReceipts[message.id] || [];
            const isRead = messageReads.some(r => r.user_id !== userId);
            const isDeleted = message.deleted_at;

            if (isDeleted) {
              return (
                <div key={message.id} className="flex items-center justify-center">
                  <p className="text-sm text-muted-foreground italic">Message deleted</p>
                </div>
              );
            }
            
            return (
              <div
                key={message.id}
                className={`flex items-start gap-2 animate-in group ${
                  isOwn ? "flex-row-reverse" : ""
                }`}
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={message.sender?.avatar_url || undefined} />
                  <AvatarFallback className="gradient-primary text-white text-xs">
                    {message.sender?.username?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col max-w-[70%]">
                  <div
                    className={`rounded-2xl px-4 py-2 ${
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
                  ) : message.type === "voice" && message.media_url ? (
                    <audio src={message.media_url} controls className="max-w-full" />
                  ) : message.type === "file" && message.media_url ? (
                    <a
                      href={message.media_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm underline hover:opacity-80"
                    >
                      📎 {message.content}
                    </a>
                  ) : editingMessageId === message.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="flex-1"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => handleEditMessage(message.id)}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingMessageId(null);
                          setEditingContent("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <p className="break-words flex-1">
                          {highlightText(message.content, searchQuery)}
                        </p>
                        <MessageActions
                          messageId={message.id}
                          messageContent={message.content}
                          isOwn={isOwn}
                          onEdit={startEditingMessage.bind(null, message.id)}
                          onDelete={() => handleDeleteMessage(message.id)}
                        />
                      </div>
                      {message.is_edited && (
                        <p className="text-xs opacity-50 mt-1">Edited</p>
                      )}
                    </>
                  )}
                    <div className="flex items-center gap-2 text-xs opacity-70 mt-1">
                      <span>
                        {new Date(message.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {isOwn && (
                        isRead ? (
                          <CheckCheck className="w-3 h-3 text-blue-500" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )
                      )}
                    </div>
                  </div>
                  <MessageReactions messageId={message.id} userId={userId} />
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
          <VoiceRecorder onVoiceSent={handleVoiceSent} userId={userId} />
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
