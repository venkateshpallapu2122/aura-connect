import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, MessageCircle, Search, Plus, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ChatSidebarProps {
  userId: string;
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
}

interface Conversation {
  id: string;
  type: string;
  name: string | null;
  avatar_url: string | null;
  updated_at: string;
  otherUser?: {
    username: string;
    avatar_url: string | null;
    is_online: boolean;
  };
}

const ChatSidebar = ({ userId, selectedConversationId, onSelectConversation }: ChatSidebarProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<{ id: string; username: string; avatar_url: string | null; status?: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadConversations();
    loadUsers();

    // Subscribe to new conversations
    const channel = supabase
      .channel("conversations")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_participants",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadConversations = async () => {
    const { data: participations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId);

    if (!participations) return;

    const conversationIds = participations.map((p) => p.conversation_id);

    const { data: convos } = await supabase
      .from("conversations")
      .select("*")
      .in("id", conversationIds)
      .order("updated_at", { ascending: false });

    if (!convos) return;

    // Get other participants for direct messages
    const conversationsWithUsers = await Promise.all(
      convos.map(async (convo) => {
        if (convo.type === "direct") {
          const { data: participants } = await supabase
            .from("conversation_participants")
            .select("user_id")
            .eq("conversation_id", convo.id)
            .neq("user_id", userId);

          if (participants && participants.length > 0) {
            const { data: otherUser } = await supabase
              .from("profiles")
              .select("username, avatar_url, is_online")
              .eq("id", participants[0].user_id)
              .single();

            return {
              ...convo,
              otherUser,
            };
          }
        }
        return convo;
      })
    );

    setConversations(conversationsWithUsers);
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", userId);

    if (data) {
      setUsers(data);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const createConversation = async (otherUserId: string) => {
    try {
      // Check if conversation already exists
      const { data: existingParticipations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId);

      if (existingParticipations) {
        for (const participation of existingParticipations) {
          const { data: otherParticipant } = await supabase
            .from("conversation_participants")
            .select("user_id")
            .eq("conversation_id", participation.conversation_id)
            .eq("user_id", otherUserId)
            .single();

          if (otherParticipant) {
            onSelectConversation(participation.conversation_id);
            setShowNewChat(false);
            return;
          }
        }
      }

      // Create new conversation
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({ 
          type: "direct",
          created_by: userId 
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add participants
      const { error: partError } = await supabase
        .from("conversation_participants")
        .insert([
          { conversation_id: conversation.id, user_id: userId },
          { conversation_id: conversation.id, user_id: otherUserId },
        ]);

      if (partError) throw partError;

      onSelectConversation(conversation.id);
      setShowNewChat(false);
      toast({
        title: "Chat created",
        description: "Start your conversation!",
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

  const filteredConversations = conversations.filter((conv) => {
    if (conv.type === "direct" && conv.otherUser) {
      return conv.otherUser.username.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return conv.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="w-80 bg-chat-sidebar border-r border-border flex flex-col h-full">
      <div className="p-4 border-b border-border bg-chat-header">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">Chats</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/profile-settings")}
              className="hover:bg-secondary"
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="hover:bg-secondary"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredConversations.map((conversation) => {
            const displayName =
              conversation.type === "direct" && conversation.otherUser
                ? conversation.otherUser.username
                : conversation.name || "Group Chat";
            const avatarUrl = conversation.otherUser?.avatar_url || conversation.avatar_url;
            const isOnline = conversation.otherUser?.is_online || false;

            return (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={`w-full p-3 rounded-lg hover:bg-secondary transition-colors flex items-center gap-3 ${
                  selectedConversationId === conversation.id ? "bg-secondary" : ""
                }`}
              >
                <div className="relative">
                  <Avatar>
                    <AvatarImage src={avatarUrl || undefined} />
                    <AvatarFallback className="gradient-primary text-white">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-status-online rounded-full border-2 border-chat-sidebar" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{displayName}</p>
                  <p className="text-sm text-muted-foreground">Click to chat</p>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
          <DialogTrigger asChild>
            <Button className="w-full gradient-primary text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start a new chat</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-80">
              <div className="space-y-2">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => createConversation(user.id)}
                    className="w-full p-3 rounded-lg hover:bg-secondary transition-colors flex items-center gap-3"
                  >
                    <Avatar>
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="gradient-primary text-white">
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="font-medium">{user.username}</p>
                      <p className="text-sm text-muted-foreground">{user.status}</p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ChatSidebar;
