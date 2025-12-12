"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TagSelector } from "@/components/tag-selector";

interface DuaFormData {
  title: string;
  arabicText: string;
  translation: string;
  transliteration?: string;
  description?: string;
  source?: string;
}

interface DuaFormProps {
  initialData?: DuaFormData;
  initialTagIds?: string[];
  duaId?: string;
  mode: "create" | "edit";
}

export function DuaForm({
  initialData,
  initialTagIds,
  duaId,
  mode,
}: DuaFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    initialTagIds || []
  );
  const [formData, setFormData] = useState<DuaFormData>({
    title: initialData?.title || "",
    arabicText: initialData?.arabicText || "",
    translation: initialData?.translation || "",
    transliteration: initialData?.transliteration || "",
    description: initialData?.description || "",
    source: initialData?.source || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.arabicText || !formData.translation) {
      alert(
        "Please fill in the required fields (Title, Arabic Text, Translation)"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const url = mode === "create" ? "/api/duas" : `/api/duas/${duaId}`;
      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, tagIds: selectedTagIds }),
      });

      if (response.ok) {
        router.push("/");
        router.refresh();
      } else {
        const error = await response.json();
        alert(`Failed to ${mode} dua: ${error.message}`);
      }
    } catch (error) {
      console.error(`${mode} failed:`, error);
      alert(`Failed to ${mode} dua`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="space-y-6 max-w-2xl mx-auto"
    >
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="e.g., Dua for Anxiety"
          required
        />
        <p className="text-xs text-muted-foreground">
          A short, memorable title for this dua
        </p>
      </div>

      {/* Arabic Text */}
      <div className="space-y-2">
        <Label htmlFor="arabicText">
          Arabic Text <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="arabicText"
          name="arabicText"
          value={formData.arabicText}
          onChange={handleChange}
          placeholder="أدخل النص العربي هنا"
          required
          className="arabic-text min-h-[120px] text-xl"
          dir="rtl"
        />
      </div>

      {/* Translation */}
      <div className="space-y-2">
        <Label htmlFor="translation">
          Translation <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="translation"
          name="translation"
          value={formData.translation}
          onChange={handleChange}
          placeholder="Enter the English translation"
          required
          className="min-h-[100px]"
        />
      </div>

      {/* Transliteration */}
      <div className="space-y-2">
        <Label htmlFor="transliteration">Transliteration (Optional)</Label>
        <Textarea
          id="transliteration"
          name="transliteration"
          value={formData.transliteration}
          onChange={handleChange}
          placeholder="e.g., Allahumma inni a'udhu bika..."
          className="min-h-[100px] italic"
        />
        <p className="text-xs text-muted-foreground">
          For those who cannot read Arabic script
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="When to recite this dua, its benefits, or any additional context"
          className="min-h-[80px]"
        />
      </div>

      {/* Source */}
      <div className="space-y-2">
        <Label htmlFor="source">Source (Optional)</Label>
        <Input
          id="source"
          name="source"
          value={formData.source}
          onChange={handleChange}
          placeholder="e.g., Sahih Bukhari, Quran 2:286, Fortress of the Muslim"
        />
        <p className="text-xs text-muted-foreground">
          Reference or origin of this dua
        </p>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags (Optional)</Label>
        <TagSelector
          selectedTagIds={selectedTagIds}
          onChange={setSelectedTagIds}
        />
        <p className="text-xs text-muted-foreground">
          Categorize this dua for easier filtering
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {mode === "create" ? "Creating..." : "Saving..."}
            </span>
          ) : mode === "create" ? (
            "Add Dua"
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </motion.form>
  );
}
