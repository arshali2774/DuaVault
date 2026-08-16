"use client";

import { ExternalLink } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import type { PossibleDuplicateMatch } from "@/lib/duplicate-detection";

export type { PossibleDuplicateMatch as DuplicateMatch } from "@/lib/duplicate-detection";

interface DuplicateWarningModalProps {
  match: PossibleDuplicateMatch;
  onDismiss: () => void;
  onConfirm: () => void;
  isConfirming?: boolean;
}

// Shown when the add/edit-dua form gets a 409 "possible duplicate" response.
// Layout validated via a live prototype during planning (Wayfinder ticket
// https://github.com/arshali2774/DuaVault/issues/43).
export function DuplicateWarningModal({
  match,
  onDismiss,
  onConfirm,
  isConfirming = false,
}: DuplicateWarningModalProps) {
  return (
    <Modal
      isOpen
      onClose={onDismiss}
      title="This looks like a dua you already have"
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          The Arabic text you entered matches an existing entry in your
          collection:
        </p>
        <div className="border border-border rounded-xl p-4 bg-secondary/30">
          <p className="font-semibold mb-2">{match.title}</p>
          <p className="arabic-display text-sm mb-2">{match.arabicText}</p>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {match.translation}
          </p>
          <a
            href={`/dua/${match.id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
          >
            View existing entry <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onDismiss}
            disabled={isConfirming}
            className="px-5 py-2.5 rounded-xl border border-input hover:bg-secondary transition-colors text-sm disabled:opacity-50"
          >
            Let me change mine
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className="px-5 py-2.5 rounded-xl font-medium bg-primary text-primary-foreground hover:opacity-90 transition-colors text-sm disabled:opacity-50"
          >
            {isConfirming ? "Adding..." : "Add it anyway"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
