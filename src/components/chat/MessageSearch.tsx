import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MessageSearchProps {
  onSearch: (query: string) => void;
  onClose: () => void;
  resultCount?: number;
  currentResultIndex?: number;
  onNavigateResult?: (direction: "up" | "down") => void;
}

const MessageSearch = ({ 
  onSearch, 
  onClose, 
  resultCount = 0, 
  currentResultIndex = 0,
  onNavigateResult 
}: MessageSearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && onNavigateResult) {
      e.preventDefault();
      onNavigateResult(e.shiftKey ? "up" : "down");
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 border-b border-border bg-secondary/30 backdrop-blur-sm">
      <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <Input
        placeholder="Search messages..."
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
        autoFocus
      />
      {searchQuery && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
          <span className="min-w-[60px] text-center">
            {resultCount > 0 ? `${currentResultIndex + 1}/${resultCount}` : "No results"}
          </span>
          {resultCount > 1 && onNavigateResult && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onNavigateResult("up")}
                className="h-7 w-7"
                title="Previous result (Shift+Enter)"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onNavigateResult("down")}
                className="h-7 w-7"
                title="Next result (Enter)"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="h-8 w-8 flex-shrink-0"
        title="Close search (Esc)"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default MessageSearch;
