import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MessageSearchProps {
  onSearch: (query: string) => void;
  onClose: () => void;
}

const MessageSearch = ({ onSearch, onClose }: MessageSearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  return (
    <div className="flex items-center gap-2 p-2 border-b border-border bg-secondary/20">
      <Search className="w-4 h-4 text-muted-foreground" />
      <Input
        placeholder="Search messages..."
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        className="flex-1 border-0 bg-transparent focus-visible:ring-0"
        autoFocus
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="h-8 w-8"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default MessageSearch;
