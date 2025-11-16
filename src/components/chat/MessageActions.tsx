import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, Trash, History, Forward } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MessageActionsProps {
  messageId: string;
  messageContent: string;
  mediaUrl?: string | null;
  isOwn: boolean;
  onEdit: (content: string) => void;
  onDelete: () => void;
  onForward: () => void;
}

interface EditHistory {
  previous_content: string;
  edited_at: string;
}

const MessageActions = ({ messageId, messageContent, mediaUrl, isOwn, onEdit, onDelete, onForward }: MessageActionsProps) => {
  const [showHistory, setShowHistory] = useState(false);
  const [editHistory, setEditHistory] = useState<EditHistory[]>([]);

  const loadEditHistory = async () => {
    const { data } = await supabase
      .from("message_edit_history")
      .select("previous_content, edited_at")
      .eq("message_id", messageId)
      .order("edited_at", { ascending: false });

    if (data) {
      setEditHistory(data);
      setShowHistory(true);
    }
  };

  if (!isOwn) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onForward}>
            <Forward className="w-4 h-4 mr-2" />
            Forward
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit(messageContent)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={loadEditHistory}>
            <History className="w-4 h-4 mr-2" />
            Edit History
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit History</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[300px]">
            <div className="space-y-4">
              {editHistory.length === 0 ? (
                <p className="text-muted-foreground text-sm">No edit history</p>
              ) : (
                editHistory.map((edit, index) => (
                  <div key={index} className="p-3 bg-secondary/50 rounded-lg">
                    <p className="text-sm mb-1">{edit.previous_content}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(edit.edited_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MessageActions;
