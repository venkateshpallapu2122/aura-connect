import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chat-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Chat exported successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const importChat = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);

    try {
      const text = await file.text();
      const exportData = JSON.parse(text);

      if (!exportData.messages || !Array.isArray(exportData.messages)) {
        throw new Error("Invalid backup file format");
      }

      // Import messages
      const messagesToImport = exportData.messages.map((msg: any) => ({
        conversation_id: conversationId,
        sender_id: userId,
        content: msg.content,
        type: msg.type || "text",
        media_url: msg.media_url,
      }));

      const { error } = await supabase
        .from("messages")
        .insert(messagesToImport);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Restored ${messagesToImport.length} messages`,
      });

      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
          <DialogDescription>
            Export your chat history or restore from a backup file
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Button
            onClick={exportChat}
            disabled={exporting}
            className="w-full"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export Chat
              </>
            )}
          </Button>
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={importChat}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              variant="outline"
              className="w-full"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Restore from Backup
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatExport;
