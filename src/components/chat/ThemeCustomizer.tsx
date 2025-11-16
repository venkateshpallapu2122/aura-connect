import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Palette } from "lucide-react";

interface ThemeCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const PRESET_THEMES = [
  { name: "Teal", color: "#2dd4bf", bg: null },
  { name: "Blue", color: "#3b82f6", bg: null },
  { name: "Purple", color: "#a855f7", bg: null },
  { name: "Pink", color: "#ec4899", bg: null },
  { name: "Green", color: "#10b981", bg: null },
  { name: "Orange", color: "#f97316", bg: null },
];

const BACKGROUND_IMAGES = [
  "https://images.unsplash.com/photo-1557683316-973673baf926",
  "https://images.unsplash.com/photo-1579546929518-9e396f3cc809",
  "https://images.unsplash.com/photo-1557682250-33bd709cbe85",
];

const ThemeCustomizer = ({ open, onOpenChange, userId }: ThemeCustomizerProps) => {
  const [themeColor, setThemeColor] = useState("#2dd4bf");
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadTheme();
    }
  }, [open]);

  const loadTheme = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("theme_color, theme_background")
      .eq("id", userId)
      .single();

    if (data) {
      setThemeColor(data.theme_color || "#2dd4bf");
      setBgImage(data.theme_background);
    }
  };

  const applyTheme = (color: string, background: string | null) => {
    // Convert hex to HSL
    const hexToHSL = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }

      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    const hsl = hexToHSL(color);
    document.documentElement.style.setProperty("--primary", hsl);
    document.documentElement.style.setProperty("--chat-bubble-sent", hsl);
    
    if (background) {
      document.body.style.backgroundImage = `url(${background})`;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundAttachment = "fixed";
    } else {
      document.body.style.backgroundImage = "";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          theme_color: themeColor,
          theme_background: bgImage,
        })
        .eq("id", userId);

      if (error) throw error;

      applyTheme(themeColor, bgImage);

      toast({
        title: "Theme saved",
        description: "Your theme preferences have been updated",
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving theme:", error);
      toast({
        title: "Error",
        description: "Failed to save theme",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Customize Theme
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <Label className="mb-3 block">Choose Color</Label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_THEMES.map((theme) => (
                <button
                  key={theme.name}
                  onClick={() => setThemeColor(theme.color)}
                  className={`h-12 rounded-lg transition-all ${
                    themeColor === theme.color
                      ? "ring-2 ring-offset-2 ring-primary scale-105"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: theme.color }}
                  title={theme.name}
                />
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Background Image</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setBgImage(null)}
                className={`h-20 rounded-lg border-2 transition-all flex items-center justify-center ${
                  bgImage === null
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <span className="text-sm font-medium">None</span>
              </button>
              {BACKGROUND_IMAGES.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setBgImage(img)}
                  className={`h-20 rounded-lg border-2 transition-all overflow-hidden ${
                    bgImage === img
                      ? "border-primary ring-2 ring-offset-2 ring-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                  style={{
                    backgroundImage: `url(${img})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? "Saving..." : "Save Theme"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ThemeCustomizer;
