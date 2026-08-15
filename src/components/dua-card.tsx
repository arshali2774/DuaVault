"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Pencil, Trash2, BookOpen } from "lucide-react";
import { ConfirmModal } from "@/components/ui/modal";
import type { Dua } from "@/lib/supabase";
import { formatTagName } from "@/lib/dua-tags";

interface DuaCardProps {
  dua: Dua;
  onDelete?: (id: string) => void;
}

export function DuaCard({ dua, onDelete }: DuaCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/duas/${dua.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onDelete?.(dua.id);
      } else {
        alert("Failed to delete dua");
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete dua");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="group relative bg-card border border-border rounded-2xl overflow-hidden shadow-md shadow-primary/5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/15 transition-all duration-200"
      >
        {/* Inner glow effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br from-primary/15 via-transparent to-primary/15" />

        {/* Header with Title and Actions */}
        <div className="relative p-4 pb-3 flex items-start justify-between gap-2 border-b border-border">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{dua.title}</h3>
            {dua.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {dua.description}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Link
              href={`/dua/${dua.id}/edit`}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Arabic Text */}
        <Link href={`/dua/${dua.id}`} className="block p-4">
          <p className="arabic-display text-foreground mb-4">
            {dua.arabicText}
          </p>

          {/* Translation */}
          <p className="translation-text text-muted-foreground line-clamp-3 mb-2">
            {dua.translation}
          </p>

          {/* Transliteration */}
          {dua.transliteration && (
            <p className="transliteration-text line-clamp-2 italic text-muted-foreground">
              {dua.transliteration}
            </p>
          )}
        </Link>

        {/* Footer with Tags and Source */}
        <div className="px-4 pb-4 space-y-2">
          {/* Tags */}
          {dua.tags && dua.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {dua.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full"
                >
                  {formatTagName(tag.name)}
                </span>
              ))}
            </div>
          )}

          {/* Source */}
          {dua.source && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {dua.source}
            </p>
          )}
        </div>
      </motion.div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Dua"
        message={`Are you sure you want to delete "${dua.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        isLoading={isDeleting}
      />
    </>
  );
}

// Grid container for dua cards - Masonry layout
interface DuaGridProps {
  duas: Dua[];
  onDelete?: (id: string) => void;
}

export function DuaGrid({ duas, onDelete }: DuaGridProps) {
  if (duas.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">No duas found</h3>
        <p className="text-muted-foreground mb-6">
          Start building your collection by adding your first dua.
        </p>
        <Link
          href="/dua/new"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          Add Your First Dua
        </Link>
      </div>
    );
  }

  return (
    <div className="columns-1 md:columns-2 xl:columns-3 gap-6 space-y-6">
      {duas.map((dua) => (
        <div key={dua.id} className="break-inside-avoid">
          <DuaCard dua={dua} onDelete={onDelete} />
        </div>
      ))}
    </div>
  );
}
