import { useState } from "react";
import { Ban, Flag, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MoreVertical } from "lucide-react";

interface UserActionsProps {
  userId: string;
  targetUserId: string;
  targetUsername: string;
  isBlocked: boolean;
  onBlock: () => Promise<boolean>;
  onUnblock: () => Promise<boolean>;
}

const REPORT_REASONS = [
  { value: "spam", label: "Spam or unwanted messages" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "impersonation", label: "Impersonation" },
  { value: "scam", label: "Scam or fraud" },
  { value: "other", label: "Other" },
];

const UserActions = ({
  userId,
  targetUserId,
  targetUsername,
  isBlocked,
  onBlock,
  onUnblock,
}: UserActionsProps) => {
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleReport = async () => {
    if (!reportReason) {
      toast({
        title: "Error",
        description: "Please select a reason for your report.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("user_reports").insert({
        reporter_id: userId,
        reported_id: targetUserId,
        reason: reportReason,
        description: reportDescription.trim() || null,
      });

      if (error) throw error;

      toast({
        title: "Report submitted",
        description: "Thank you for your report. We will review it shortly.",
      });
      setShowReportDialog(false);
      setReportReason("");
      setReportDescription("");
    } catch (error) {
      console.error("Error submitting report:", error);
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBlock = async () => {
    const success = await onBlock();
    if (success) {
      setShowBlockDialog(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">User actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isBlocked ? (
            <DropdownMenuItem onClick={onUnblock}>
              <ShieldOff className="mr-2 h-4 w-4" />
              Unblock {targetUsername}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setShowBlockDialog(true)}>
              <Ban className="mr-2 h-4 w-4" />
              Block {targetUsername}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowReportDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Flag className="mr-2 h-4 w-4" />
            Report {targetUsername}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Block Confirmation Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block {targetUsername}?</DialogTitle>
            <DialogDescription>
              When you block someone:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>You will not see their messages</li>
                <li>They will not be notified that you blocked them</li>
                <li>You can unblock them at any time</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBlock}>
              <Ban className="mr-2 h-4 w-4" />
              Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report {targetUsername}</DialogTitle>
            <DialogDescription>
              Help us understand what happened. Your report will be reviewed by our team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for report</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger id="reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Additional details (optional)</Label>
              <Textarea
                id="description"
                placeholder="Provide any additional context that might help us review this report..."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                maxLength={500}
                rows={4}
              />
              <p className="text-xs text-muted-foreground text-right">
                {reportDescription.length}/500
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReportDialog(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReport}
              disabled={submitting || !reportReason}
            >
              <Flag className="mr-2 h-4 w-4" />
              {submitting ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserActions;
