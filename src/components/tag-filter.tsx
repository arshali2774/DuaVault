"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { Tag } from "@/lib/supabase";

interface TagFilterProps {
  selectedTag: string | null;
  onTagChange: (tagName: string | null) => void;
}

export function TagFilter({ selectedTag, onTagChange }: TagFilterProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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

    fetchTags();
  }, []);

  // Capitalize first letter for display
  const formatTagName = (name: string) => {
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-8 w-20 bg-muted rounded-full animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* All button */}
      <button
        onClick={() => onTagChange(null)}
        className={`
          px-4 py-1.5 rounded-full text-sm font-medium
          transition-all duration-150
          ${
            selectedTag === null
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }
        `}
      >
        All
      </button>

      {/* Tag buttons */}
      {tags.map((tag) => {
        const isSelected = selectedTag === tag.name;
        return (
          <button
            key={tag.id}
            onClick={() => onTagChange(isSelected ? null : tag.name)}
            className={`
              inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium
              transition-all duration-150
              ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }
            `}
          >
            {formatTagName(tag.name)}
            {isSelected && (
              <X
                className="w-3.5 h-3.5"
                onClick={(e) => {
                  e.stopPropagation();
                  onTagChange(null);
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
