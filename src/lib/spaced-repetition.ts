// SM-2 Spaced Repetition Algorithm
// Based on SuperMemo 2 algorithm used by Anki and other flashcard apps

export interface SpacedRepetitionData {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: Date | null;
}

export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

// Quality ratings:
// 5 - Perfect response
// 4 - Correct response after hesitation
// 3 - Correct response with serious difficulty
// 2 - Incorrect response, but correct answer seemed easy to recall
// 1 - Incorrect response, but remembered upon seeing correct answer
// 0 - Complete blackout

export function calculateNextReview(
  currentData: SpacedRepetitionData,
  quality: Quality
): SpacedRepetitionData {
  let { easeFactor, interval, repetitions } = currentData;

  // Update ease factor using SM-2 formula
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  if (quality < 3) {
    // Failed - reset repetitions and interval
    repetitions = 0;
    interval = 1;
  } else {
    // Passed - calculate next interval
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions++;
  }

  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    easeFactor,
    interval,
    repetitions,
    nextReviewDate,
  };
}

// Simplified quality buttons for the UI
export type SimpleQuality = "again" | "hard" | "good" | "easy";

export function simpleQualityToNumber(quality: SimpleQuality): Quality {
  switch (quality) {
    case "again":
      return 0;
    case "hard":
      return 2;
    case "good":
      return 4;
    case "easy":
      return 5;
  }
}

// Get interval description for UI
export function getIntervalDescription(interval: number): string {
  if (interval === 0) return "New";
  if (interval === 1) return "1 day";
  if (interval < 7) return `${interval} days`;
  if (interval < 30)
    return `${Math.round(interval / 7)} week${interval >= 14 ? "s" : ""}`;
  if (interval < 365)
    return `${Math.round(interval / 30)} month${interval >= 60 ? "s" : ""}`;
  return `${Math.round(interval / 365)} year${interval >= 730 ? "s" : ""}`;
}

// Check if a dua is due for review
export function isDueForReview(nextReviewDate: Date | null): boolean {
  if (!nextReviewDate) return true; // New cards are always due
  return new Date() >= new Date(nextReviewDate);
}
