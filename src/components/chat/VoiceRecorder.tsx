import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Trash2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VoiceRecorderProps {
  onVoiceSent: (url: string) => void;
  userId: string;
}

const VoiceRecorder = ({ onVoiceSent, userId }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      if (audioContextRef.current) {
        await audioContextRef.current.close();
      }

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateWaveform = () => {
        analyser.getByteFrequencyData(dataArray);
        const normalizedData = Array.from(dataArray.slice(0, 20)).map(v => v / 255);
        setWaveformData(normalizedData);
        animationFrameRef.current = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setWaveformData([]);
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setWaveformData([]);
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob) return;

    try {
      const fileName = `voice-${Date.now()}.webm`;
      const { data, error } = await supabase.storage
        .from("chat-media")
        .upload(`${userId}/${fileName}`, audioBlob);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("chat-media")
        .getPublicUrl(data.path);

      onVoiceSent(publicUrl);
      deleteRecording();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      {!audioBlob ? (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
            className={isRecording ? "bg-destructive/10" : "hover:bg-secondary"}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? <Square className="w-5 h-5 text-destructive" /> : <Mic className="w-5 h-5" />}
          </Button>
          {isRecording && (
            <div className="flex items-center gap-1 h-8">
              {waveformData.map((height, i) => (
                <div
                  key={i}
                  className="w-1 bg-primary rounded-full transition-all"
                  style={{ height: `${Math.max(4, height * 32)}px` }}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <audio src={audioUrl || undefined} controls className="h-8" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={deleteRecording}
            className="hover:bg-destructive/10"
            aria-label="Delete recording"
          >
            <Trash2 className="w-5 h-5 text-destructive" />
          </Button>
          <Button
            type="button"
            size="icon"
            onClick={sendVoiceMessage}
            className="gradient-primary text-white"
            aria-label="Send voice message"
          >
            <Send className="w-5 h-5" />
          </Button>
        </>
      )}
    </div>
  );
};

export default VoiceRecorder;
