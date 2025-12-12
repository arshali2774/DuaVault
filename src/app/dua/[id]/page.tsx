import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase, dbToApp } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Pencil, ArrowLeft, BookOpen } from "lucide-react";

interface DuaDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DuaDetailPage({ params }: DuaDetailPageProps) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("duas")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const dua = dbToApp(data);

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="pt-20 pb-28 md:pb-8 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Library
          </Link>

          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">{dua.title}</h1>
              {dua.description && (
                <p className="text-muted-foreground">{dua.description}</p>
              )}
            </div>
            <Link
              href={`/dua/${dua.id}/edit`}
              className="p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <Pencil className="w-5 h-5" />
            </Link>
          </div>

          {/* Arabic Text */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <h2 className="text-sm font-medium text-muted-foreground mb-4">
              Arabic
            </h2>
            <p className="arabic-display text-foreground">{dua.arabicText}</p>
          </div>

          {/* Translation */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <h2 className="text-sm font-medium text-muted-foreground mb-4">
              Translation
            </h2>
            <p className="translation-text text-foreground">
              {dua.translation}
            </p>
          </div>

          {/* Transliteration */}
          {dua.transliteration && (
            <div className="bg-card border border-border rounded-2xl p-6 mb-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-4">
                Transliteration
              </h2>
              <p className="transliteration-text">{dua.transliteration}</p>
            </div>
          )}

          {/* Source */}
          {dua.source && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <BookOpen className="w-4 h-4" />
              <span className="text-sm">Source: {dua.source}</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
