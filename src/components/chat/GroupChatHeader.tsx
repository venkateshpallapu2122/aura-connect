import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Participant {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

interface GroupChatHeaderProps {
  conversationId: string;
  conversationName: string;
  conversationType: string;
  userId: string;
}

const GroupChatHeader = ({
  conversationId,
  conversationName,
  conversationType,
  userId,
}: GroupChatHeaderProps) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadParticipants();
    checkAdminStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const loadParticipants = async () => {
    const { data } = await supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId);

    if (data) {
      const participantsWithProfiles = await Promise.all(
        data.map(async (p) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", p.user_id)
            .single();

          return {
            user_id: p.user_id,
            username: profile?.username || "Unknown",
            avatar_url: profile?.avatar_url || null,
          };
        })
      );
      setParticipants(participantsWithProfiles);
    }
  };

  const checkAdminStatus = async () => {
    const { data } = await supabase
      .from("group_admins")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();

    setIsAdmin(!!data);
  };

  if (conversationType !== "group") return null;

  return (
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarFallback className="gradient-primary text-white">
          <Users className="w-5 h-5" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <h2 className="font-semibold">{conversationName}</h2>
        <p className="text-sm text-muted-foreground">
          {participants.length} participants
        </p>
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Group Members</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {participants.map((participant) => (
                <div
                  key={participant.user_id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={participant.avatar_url || undefined} />
                    <AvatarFallback className="gradient-primary text-white">
                      {participant.username?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">
                    {participant.username}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupChatHeader;
