"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const placeholderTexts = [
  "Search by title...",
  "Search by translation...",
  "Search by transliteration...",
  "Try: SubhanAllah",
  "Try: anxiety",
  "Try: after prayer",
];

export function SearchBar({
  value,
  onChange,
  placeholder,
  className,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  // Rotate placeholders
  useEffect(() => {
    if (!placeholder && !isFocused && !value) {
      const interval = setInterval(() => {
        setPlaceholderIndex((prev) => (prev + 1) % placeholderTexts.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isFocused, value, placeholder]);

  const handleClear = useCallback(() => {
    onChange("");
  }, [onChange]);

  return (
    <div
      className={cn(
        "relative flex items-center bg-secondary rounded-xl transition-all",
        isFocused && "ring-2 ring-ring",
        className
      )}
    >
      <Search className="absolute left-4 w-5 h-5 text-muted-foreground" />

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="w-full h-12 pl-12 pr-12 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
        placeholder={placeholder}
      />

      {/* Animated placeholder */}
      {!placeholder && !value && !isFocused && (
        <div className="absolute left-12 pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.span
              key={placeholderIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-muted-foreground"
            >
              {placeholderTexts[placeholderIndex]}
            </motion.span>
          </AnimatePresence>
        </div>
      )}

      {/* Clear button */}
      <AnimatePresence>
        {value && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={handleClear}
            className="absolute right-4 p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
