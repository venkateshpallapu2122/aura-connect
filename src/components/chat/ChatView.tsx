import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Smile, MessageCircle, Search, Check, CheckCheck, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import MessageForward from "./MessageForward";
import ThemeCustomizer from "./ThemeCustomizer";
import ScheduledMessages from "./ScheduledMessages";
import MessageReply, { ReplyMessageDisplay } from "./MessageReply";
import TypingIndicator from "./TypingIndicator";
import PinnedMessages from "./PinnedMessages";

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
  reply_to_id?: string | null;
  sender?: {
    username: string;
    avatar_url: string | null;
  };
}

const ChatView = ({ userId, conversationId }: ChatViewProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState<{ id: string; username: string; avatar_url: string | null; is_online: boolean } | null>(null);
  const [currentUsername, setCurrentUsername] = useState("");
  const [conversationType, setConversationType] = useState<string>("direct");
  const [conversationName, setConversationName] = useState<string>("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [forwardingMessage, setForwardingMessage] = useState<{ id: string; content: string; mediaUrl?: string | null } | null>(null);
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  const [showScheduledMessages, setShowScheduledMessages] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<{ id: string; content: string; sender?: { username: string } } | null>(null);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { typingUsers, setTyping } = useTypingIndicator(conversationId, userId);
  const { readReceipts, markAsRead } = useReadReceipts(conversationId, userId);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const MESSAGES_PER_PAGE = 50;

  useNotifications(userId, conversationId);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!conversationId) return;

    setMessages([]);
    setPage(0);
    setHasMore(true);
    loadMessages(0);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    // Only auto-scroll to bottom if we are on the first page
    if (page === 0) {
      scrollToBottom();
    }
    // Mark messages as read when viewing them
    messages.forEach((msg) => {
      if (msg.sender_id !== userId) {
        markAsRead(msg.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const loadMessages = async (pageIndex: number) => {
    if (!conversationId) return;

    const from = pageIndex * MESSAGES_PER_PAGE;
    const to = from + MESSAGES_PER_PAGE - 1;

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (data) {
      if (data.length < MESSAGES_PER_PAGE) {
        setHasMore(false);
      }

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
            sender: profile || { username: "Deleted User", avatar_url: null },
          };
        })
      );

      setMessages((prev) => {
        const newMessages = messagesWithProfiles.reverse();
        // Remove duplicates just in case
        const existingIds = new Set(prev.map(m => m.id));
        const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));
        return [...uniqueNewMessages, ...prev];
      });
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop === 0 && hasMore) {
      const newPage = page + 1;
      setPage(newPage);
      loadMessages(newPage);
    }
  };

  const loadSenderProfile = async (message: Message) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", message.sender_id)
      .single();

    setMessages((prev) => [...prev, { ...message, sender: profile || { username: "Deleted User", avatar_url: null } }]);
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
        reply_to_id: replyToMessage?.id,
      });

      if (error) throw error;

      setNewMessage("");
      setShowEmojiPicker(false);
      setTyping(false, currentUsername);
      setReplyToMessage(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleMediaUploaded = (url: string, type: "image" | "file") => {
    sendMessage(new Event("submit") as React.FormEvent, url, type);
  };

  const handleVoiceSent = (url: string) => {
    sendMessage(new Event("submit") as React.FormEvent, url, "voice");
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return renderText(text);
    const regex = new RegExp(`(${highlight})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} className="bg-yellow-300 dark:bg-yellow-600">{part}</mark> : renderText(part)
    );
  };

  const renderText = (text: string) => {
    // Regex to find URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:opacity-80 break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: "Error",
        description: errorMessage,
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const startEditingMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditingContent(content);
  };

  const handlePinMessage = async (messageId: string) => {
    try {
      // Check if already pinned
      const { data: existing } = await supabase
        .from("pinned_messages")
        .select("id")
        .eq("message_id", messageId)
        .eq("conversation_id", conversationId)
        .single();

      if (existing) {
        // Unpin
        await supabase
          .from("pinned_messages")
          .delete()
          .eq("id", existing.id);

        toast({
          title: "Success",
          description: "Message unpinned",
        });
      } else {
        // Pin
        await supabase.from("pinned_messages").insert({
          message_id: messageId,
          conversation_id: conversationId!,
          pinned_by: userId,
        });

        toast({
          title: "Success",
          description: "Message pinned",
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("bg-primary/10");
      setTimeout(() => element.classList.remove("bg-primary/10"), 2000);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const addEmoji = (emoji: { native: string }) => {
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
          {conversationId && <ChatExport conversationId={conversationId} userId={userId} />}
          {conversationId && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Trash2 className="w-5 h-5 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear chat history?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all messages in this conversation for everyone. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async () => {
                      try {
                        const { error } = await supabase
                          .from("messages")
                          .delete()
                          .eq("conversation_id", conversationId);

                        if (error) throw error;

                        loadMessages();
                        toast({
                          title: "Chat cleared",
                          description: "All messages have been deleted",
                        });
                      } catch (error: unknown) {
                        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
                        toast({
                          title: "Error",
                          description: errorMessage,
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Clear Chat
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {conversationType === "group" && (
            <GroupVoiceChat conversationId={conversationId!} userId={userId} />
          )}
        </div>
      </div>

      {showSearch && (
        <MessageSearch onSearch={handleSearch} onClose={() => { setShowSearch(false); setSearchQuery(""); }} />
      )}

      {conversationId && (
        <PinnedMessages
          conversationId={conversationId}
          userId={userId}
          onMessageClick={scrollToMessage}
        />
      )}

      {/* Messages */}
      <ScrollArea
        className="flex-1 p-4"
        onScrollCapture={handleScroll}
      >
        <TypingIndicator typingUsers={typingUsers} />
        <div className="space-y-4">
          {hasMore && (
            <div className="text-center py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newPage = page + 1;
                  setPage(newPage);
                  loadMessages(newPage);
                }}
                disabled={!hasMore}
              >
                Load older messages
              </Button>
            </div>
          )}
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
                id={`message-${message.id}`}
                className={`flex items-start gap-2 animate-in group transition-colors ${
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
                  {message.reply_to_id && (
                    <ReplyMessageDisplay
                      replyToId={message.reply_to_id}
                      onReplyClick={() => scrollToMessage(message.reply_to_id!)}
                    />
                  )}
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
                          mediaUrl={message.media_url}
                          isOwn={isOwn}
                          onEdit={startEditingMessage.bind(null, message.id)}
                          onDelete={() => handleDeleteMessage(message.id)}
                          onForward={() => setForwardingMessage({ id: message.id, content: message.content, mediaUrl: message.media_url })}
                          onReply={() => setReplyToMessage({ id: message.id, content: message.content, sender: message.sender })}
                          onPin={() => handlePinMessage(message.id)}
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
        {replyToMessage && (
          <MessageReply
            replyTo={replyToMessage}
            onCancel={() => setReplyToMessage(null)}
          />
        )}
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

      {conversationId && (
        <>
          <MessageForward
            messageId={forwardingMessage?.id || ""}
            messageContent={forwardingMessage?.content || ""}
            mediaUrl={forwardingMessage?.mediaUrl}
            open={!!forwardingMessage}
            onOpenChange={(open) => !open && setForwardingMessage(null)}
            currentConversationId={conversationId}
          />
          <ThemeCustomizer
            open={showThemeCustomizer}
            onOpenChange={setShowThemeCustomizer}
            userId={userId}
          />
          <ScheduledMessages
            open={showScheduledMessages}
            onOpenChange={setShowScheduledMessages}
            conversationId={conversationId}
            userId={userId}
          />
        </>
      )}
    </div>
  );
};

export default ChatView;
