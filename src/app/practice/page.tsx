"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { RotateCcw, Brain, CheckCircle2, Zap, ArrowLeft } from "lucide-react";
import { getIntervalDescription } from "@/lib/spaced-repetition";
import type { Dua } from "@/lib/supabase";

type SimpleQuality = "again" | "hard" | "good" | "easy";

export default function PracticePage() {
  const [duas, setDuas] = useState<Dua[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    correct: 0,
  });

  // Fetch duas due for practice
  useEffect(() => {
    const fetchDuas = async () => {
      try {
        const response = await fetch("/api/duas/practice");
        if (response.ok) {
          const data = await response.json();
          setDuas(data);
        }
      } catch (error) {
        console.error("Failed to fetch practice duas:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDuas();
  }, []);

  const currentDua = duas[currentIndex];

  const handleResponse = async (quality: SimpleQuality) => {
    if (!currentDua || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/duas/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duaId: currentDua.id,
          quality,
        }),
      });

      if (response.ok) {
        setSessionStats((prev) => ({
          reviewed: prev.reviewed + 1,
          correct: quality !== "again" ? prev.correct + 1 : prev.correct,
        }));

        // Move to next dua
        if (currentIndex < duas.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          // Session complete
          setCurrentIndex(-1);
        }
      }
    } catch (error) {
      console.error("Failed to record response:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="pt-20 pb-28 md:pb-8 px-4 md:px-6">
          <div className="max-w-2xl mx-auto text-center py-20">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-muted-foreground">
              Loading practice session...
            </p>
          </div>
        </main>
      </div>
    );
  }

  // No duas to practice
  if (duas.length === 0) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="pt-20 pb-28 md:pb-8 px-4 md:px-6">
          <div className="max-w-2xl mx-auto text-center py-20">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">All caught up!</h1>
            <p className="text-muted-foreground mb-8">
              You have no duas due for practice right now. Add more duas or come
              back later.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Library
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Session complete
  if (currentIndex === -1) {
    const accuracy = Math.round(
      (sessionStats.correct / sessionStats.reviewed) * 100
    );

    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-20 pb-28 md:pb-8 px-4 md:px-6">
          <div className="max-w-2xl mx-auto text-center py-20">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </motion.div>
            <h1 className="text-2xl font-bold mb-2">Session Complete!</h1>
            <p className="text-muted-foreground mb-8">
              Great job practicing your duas
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto mb-8">
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-3xl font-bold text-primary">
                  {sessionStats.reviewed}
                </p>
                <p className="text-sm text-muted-foreground">Reviewed</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-3xl font-bold text-primary">{accuracy}%</p>
                <p className="text-sm text-muted-foreground">Accuracy</p>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 border border-input rounded-xl font-medium hover:bg-secondary transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Library
              </Link>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                <RotateCcw className="w-4 h-4" />
                Practice Again
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="pt-20 pb-28 md:pb-8 px-4 md:px-6">
        <div className="max-w-3xl mx-auto">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} of {duas.length}
              </span>
              <span className="text-sm text-muted-foreground">
                {getIntervalDescription(currentDua.interval)}
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{
                  width: `${((currentIndex + 1) / duas.length) * 100}%`,
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentDua.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-card border border-border rounded-2xl"
            >
              {/* Title */}
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold text-lg">{currentDua.title}</h2>
                {currentDua.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentDua.description}
                  </p>
                )}
              </div>

              {/* Arabic */}
              <div className="p-6 border-b border-border">
                <p className="arabic-display text-foreground">
                  {currentDua.arabicText}
                </p>
              </div>

              {/* Translation */}
              <div className="p-6 border-b border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  TRANSLATION
                </p>
                <p className="translation-text">{currentDua.translation}</p>
              </div>

              {/* Transliteration */}
              {currentDua.transliteration && (
                <div className="p-6 border-b border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    TRANSLITERATION
                  </p>
                  <p className="transliteration-text">
                    {currentDua.transliteration}
                  </p>
                </div>
              )}

              {/* Rating Section */}
              <div className="p-4">
                <p className="text-sm text-center text-muted-foreground mb-3">
                  How well do you know this dua?
                </p>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => handleResponse("again")}
                    disabled={isSubmitting}
                    className="py-3 px-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl font-medium transition-colors flex flex-col items-center gap-1 disabled:opacity-50"
                  >
                    <RotateCcw className="w-5 h-5" />
                    <span className="text-xs">Again</span>
                  </button>
                  <button
                    onClick={() => handleResponse("hard")}
                    disabled={isSubmitting}
                    className="py-3 px-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-xl font-medium transition-colors flex flex-col items-center gap-1 disabled:opacity-50"
                  >
                    <Brain className="w-5 h-5" />
                    <span className="text-xs">Hard</span>
                  </button>
                  <button
                    onClick={() => handleResponse("good")}
                    disabled={isSubmitting}
                    className="py-3 px-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-xl font-medium transition-colors flex flex-col items-center gap-1 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-xs">Good</span>
                  </button>
                  <button
                    onClick={() => handleResponse("easy")}
                    disabled={isSubmitting}
                    className="py-3 px-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-xl font-medium transition-colors flex flex-col items-center gap-1 disabled:opacity-50"
                  >
                    <Zap className="w-5 h-5" />
                    <span className="text-xs">Easy</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
