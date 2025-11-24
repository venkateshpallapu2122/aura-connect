import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, Image as ImageIcon, File, Loader2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MediaUploadProps {
  onMediaUploaded: (url: string, type: "image" | "file") => void;
  userId: string;
}

const MediaUpload = ({ onMediaUploaded, userId }: MediaUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<{ url: string; type: "image" | "file"; name: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const processFile = (file: File) => {
    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();

    reader.onload = (event) => {
      setPreview({
        url: event.target?.result as string,
        type: isImage ? "image" : "file",
        name: file.name,
      });
    };

    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const uploadFile = async () => {
    if (!preview) return;

    setUploading(true);
    setProgress(0);

    try {
      const file = await fetch(preview.url).then((r) => r.blob());
      const fileExt = preview.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-media")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(percentCompleted);
          },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("chat-media")
        .getPublicUrl(fileName);

      onMediaUploaded(data.publicUrl, preview.type);
      setPreview(null);
      setProgress(0);

      toast({
        title: "Success",
        description: "Media uploaded successfully",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const cancelPreview = () => {
    setPreview(null);
    setProgress(0);
  };

  if (preview) {
    return (
      <div className="border border-border rounded-lg p-4 bg-chat-header space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Preview</p>
          <Button
            variant="ghost"
            size="icon"
            onClick={cancelPreview}
            disabled={uploading}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {preview.type === "image" ? (
          <img
            src={preview.url}
            alt="Preview"
            className="max-h-48 rounded-md object-contain w-full"
          />
        ) : (
          <div className="flex items-center gap-3 p-3 bg-secondary rounded-md">
            <File className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm truncate flex-1">{preview.name}</p>
          </div>
        )}

        {uploading && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground text-center">
              Uploading... {progress}%
            </p>
          </div>
        )}

        <Button
          onClick={uploadFile}
          disabled={uploading}
          className="w-full gradient-primary text-white"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            "Send Media"
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <label htmlFor="image-upload">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hover:bg-secondary"
          asChild
        >
          <div>
            <ImageIcon className="w-5 h-5" />
          </div>
        </Button>
        <input
          id="image-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </label>

      <label htmlFor="file-upload">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hover:bg-secondary"
          asChild
        >
          <div>
            <File className="w-5 h-5" />
          </div>
        </Button>
        <input
          id="file-upload"
          type="file"
          className="hidden"
          onChange={handleFileSelect}
        />
      </label>
    </div>
  );
};

export default MediaUpload;
