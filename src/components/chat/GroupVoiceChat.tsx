import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface VoiceParticipant {
  user_id: string;
  is_muted: boolean;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
}

interface GroupVoiceChatProps {
  conversationId: string;
  userId: string;
}

const GroupVoiceChat = ({ conversationId, userId }: GroupVoiceChatProps) => {
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isInCall) return;

    const channel = supabase
      .channel(`voice:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "voice_participants",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          loadParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isInCall, sessionId]);

  const loadParticipants = async () => {
    if (!sessionId) return;

    const { data } = await supabase
      .from("voice_participants")
      .select("user_id, is_muted")
      .eq("session_id", sessionId)
      .is("left_at", null);

    if (data) {
      const participantsWithProfiles = await Promise.all(
        data.map(async (p) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", p.user_id)
            .single();

          return {
            ...p,
            profiles: profile,
          };
        })
      );
      setParticipants(participantsWithProfiles);
    }
  };

  const startCall = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      // Check for active session or create new one
      const { data: existingSession } = await supabase
        .from("voice_sessions")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("is_active", true)
        .maybeSingle();

      let currentSessionId: string;

      if (existingSession) {
        currentSessionId = existingSession.id;
      } else {
        const { data: newSession, error } = await supabase
          .from("voice_sessions")
          .insert({
            conversation_id: conversationId,
            created_by: userId,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        currentSessionId = newSession.id;
      }

      // Join as participant
      await supabase.from("voice_participants").insert({
        session_id: currentSessionId,
        user_id: userId,
        is_muted: false,
      });

      setSessionId(currentSessionId);
      setIsInCall(true);
      loadParticipants();

      toast({
        title: "Joined voice chat",
        description: "You can now talk with other participants",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const endCall = async () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (sessionId) {
      await supabase
        .from("voice_participants")
        .update({ left_at: new Date().toISOString() })
        .eq("session_id", sessionId)
        .eq("user_id", userId);
    }

    setIsInCall(false);
    setSessionId(null);
    setParticipants([]);
  };

  const toggleMute = async () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);

      if (sessionId) {
        await supabase
          .from("voice_participants")
          .update({ is_muted: !isMuted })
          .eq("session_id", sessionId)
          .eq("user_id", userId);
      }
    }
  };

  return (
    <>
      <Button
        variant={isInCall ? "destructive" : "ghost"}
        size="icon"
        onClick={isInCall ? endCall : startCall}
      >
        {isInCall ? <PhoneOff className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
      </Button>

      <Dialog open={isInCall} onOpenChange={(open) => !open && endCall()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Voice Chat</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {participants.map((participant) => (
                <div
                  key={participant.user_id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
                >
                  <Avatar>
                    <AvatarImage src={participant.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="gradient-primary text-white">
                      {participant.profiles?.username?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{participant.profiles?.username || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">
                      {participant.is_muted ? "Muted" : "Speaking"}
                    </p>
                  </div>
                  {participant.is_muted && <MicOff className="w-4 h-4 text-muted-foreground" />}
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="flex justify-center gap-4 mt-4">
            <Button
              variant={isMuted ? "destructive" : "secondary"}
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={toggleMute}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={endCall}
            >
              <PhoneOff className="w-5 h-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GroupVoiceChat;
