import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatView from "@/components/chat/ChatView";
import { useToast } from "@/hooks/use-toast";

const Chat = () => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        updateOnlineStatus(session.user.id, true);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (user) {
        updateOnlineStatus(user.id, false);
      }
    };
  }, [navigate]);

  const updateOnlineStatus = async (userId: string, isOnline: boolean) => {
    try {
      await supabase
        .from("profiles")
        .update({
          is_online: isOnline,
          last_seen: new Date().toISOString(),
        })
        .eq("id", userId);
    } catch (error) {
      console.error("Error updating online status:", error);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <ChatSidebar
        userId={user.id}
        selectedConversationId={selectedConversationId}
        onSelectConversation={setSelectedConversationId}
      />
      <ChatView
        userId={user.id}
        conversationId={selectedConversationId}
      />
    </div>
  );
};

export default Chat;
