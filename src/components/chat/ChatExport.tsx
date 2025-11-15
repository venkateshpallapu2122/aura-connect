import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ChatExportProps {
  conversationId: string;
}

const ChatExport = ({ conversationId }: ChatExportProps) => {
  const { toast } = useToast();

  const exportAsText = async () => {
    try {
      const { data: messages } = await supabase
        .from("messages")
        .select("*, profiles(username)")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (!messages) throw new Error("No messages found");

      const textContent = messages
        .map((msg: any) => {
          const timestamp = new Date(msg.created_at).toLocaleString();
          const sender = msg.profiles?.username || "Unknown";
          return `[${timestamp}] ${sender}: ${msg.content}`;
        })
        .join("\n");

      const blob = new Blob([textContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chat-export-${conversationId}.txt`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Chat exported as text file",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const exportAsPDF = async () => {
    try {
      const { data: messages } = await supabase
        .from("messages")
        .select("*, profiles(username)")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (!messages) throw new Error("No messages found");

      // Create HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Chat Export</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .message { margin-bottom: 15px; }
              .timestamp { color: #666; font-size: 12px; }
              .sender { font-weight: bold; }
            </style>
          </head>
          <body>
            <h1>Chat Export</h1>
            ${messages
              .map(
                (msg: any) => `
              <div class="message">
                <div class="timestamp">${new Date(msg.created_at).toLocaleString()}</div>
                <div><span class="sender">${msg.profiles?.username || "Unknown"}:</span> ${msg.content}</div>
              </div>
            `
              )
              .join("")}
          </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chat-export-${conversationId}.html`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Chat exported as HTML (open in browser and print to PDF)",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Download className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportAsText}>
          Export as Text
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsPDF}>
          Export as HTML/PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ChatExport;
