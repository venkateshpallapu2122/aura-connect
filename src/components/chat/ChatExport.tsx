import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const importedMessageSchema = z.object({
  content: z.string().min(1).max(10000),
  type: z.enum(["text", "media", "image", "file", "voice"]).default("text"),
  media_url: z.string().url().max(2048).nullable().optional(),
});

const importSchema = z.object({
  version: z.string().optional(),
  messages: z.array(importedMessageSchema).min(1).max(1000),
});

interface ChatExportProps {
  conversationId: string;
  userId: string;
}

const ChatExport = ({ conversationId, userId }: ChatExportProps) => {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const exportChat = async () => {
    setExporting(true);

    try {
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*, sender:profiles(username, avatar_url)")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const exportData = {
        version: "1.0",
        exported_at: new Date().toISOString(),
        conversation_id: conversationId,
        messages,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chat-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Success", description: "Chat exported successfully" });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const importChat = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit file size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Error", description: "File size must be under 10MB", variant: "destructive" });
      return;
    }

    setImporting(true);

    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON file");
      }

      const result = importSchema.safeParse(parsed);
      if (!result.success) {
        const issues = result.error.issues.map(i => i.message).join(", ");
        throw new Error(`Invalid backup format: ${issues}`);
      }

      const messagesToImport = result.data.messages.map((msg) => ({
        conversation_id: conversationId,
        sender_id: userId,
        content: msg.content,
        type: msg.type || "text",
        media_url: msg.media_url ?? null,
      }));

      const { error } = await supabase.from("messages").insert(messagesToImport);
      if (error) throw error;

      toast({ title: "Success", description: `Restored ${messagesToImport.length} messages` });
      setOpen(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Download className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Backup & Restore</DialogTitle>
          <DialogDescription>Export your chat history or restore from a backup file</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Button onClick={exportChat} disabled={exporting} className="w-full">
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" /> Export Chat
              </>
            )}
          </Button>
          <div className="relative">
            <input ref={fileInputRef} type="file" accept="application/json" onChange={importChat} className="hidden" />
            <Button onClick={() => fileInputRef.current?.click()} disabled={importing} variant="outline" className="w-full">
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Restoring...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" /> Restore from Backup
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Max 1,000 messages per import. Content limited to 10,000 characters per message.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatExport;
