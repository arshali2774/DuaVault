"use client";

import { useState, useEffect } from "react";
import { X, Plus, Check } from "lucide-react";
import type { Tag } from "@/lib/supabase";

interface TagSelectorProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
}

export function TagSelector({ selectedTagIds, onChange }: TagSelectorProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTagName, setNewTagName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const response = await fetch("/api/tags");
      if (response.ok) {
        const data = await response.json();
        setTags(data);
      }
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const createTag = async () => {
    if (!newTagName.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim() }),
      });

      if (response.ok) {
        const newTag = await response.json();
        setTags((prev) =>
          [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name))
        );
        onChange([...selectedTagIds, newTag.id]);
        setNewTagName("");
        setShowInput(false);
      } else if (response.status === 409) {
        // Tag already exists, find it and select it
        const existingTag = tags.find(
          (t) => t.name.toLowerCase() === newTagName.trim().toLowerCase()
        );
        if (existingTag && !selectedTagIds.includes(existingTag.id)) {
          onChange([...selectedTagIds, existingTag.id]);
        }
        setNewTagName("");
        setShowInput(false);
      }
    } catch (error) {
      console.error("Failed to create tag:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      createTag();
    } else if (e.key === "Escape") {
      setShowInput(false);
      setNewTagName("");
    }
  };

  // Capitalize first letter for display
  const formatTagName = (name: string) => {
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        Loading tags...
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-1">
      {/* Tag chips */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                transition-all duration-150
                ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }
              `}
            >
              {isSelected && <Check className="w-3.5 h-3.5" />}
              {formatTagName(tag.name)}
              {isSelected && (
                <X
                  className="w-3.5 h-3.5 ml-0.5 hover:bg-primary-foreground/20 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTag(tag.id);
                  }}
                />
              )}
            </button>
          );
        })}

        {/* Add new tag button/input */}
        {showInput ? (
          <div className="inline-flex items-center gap-1">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="New tag..."
              className="px-3 py-1.5 text-sm rounded-full border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 w-32"
              autoFocus
              disabled={isCreating}
            />
            <button
              type="button"
              onClick={createTag}
              disabled={!newTagName.trim() || isCreating}
              className="p-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isCreating ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowInput(false);
                setNewTagName("");
              }}
              className="p-1.5 rounded-full hover:bg-secondary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowInput(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border border-dashed border-muted-foreground/50 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Tag
          </button>
        )}
      </div>

      {/* Selected count */}
      {selectedTagIds.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selectedTagIds.length} tag{selectedTagIds.length !== 1 ? "s" : ""}{" "}
          selected
        </p>
      )}
    </div>
  );
}
