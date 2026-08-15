import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type for Dua from database (snake_case). owner_id must never appear on
// the app-facing Dua type below — dbToApp intentionally omits it.
export interface DbDua {
  id: string;
  title: string;
  arabic_text: string;
  translation: string;
  transliteration: string | null;
  description: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review_date: string | null;
  owner_id: string;
}

// Type for Dua in application (camelCase) - used by client components
export interface Dua {
  id: string;
  title: string;
  arabicText: string;
  translation: string;
  transliteration: string | null;
  description: string | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string | null;
  tags?: Tag[];
}

// Type for creating/updating a dua (camelCase for app, snake_case for DB).
// Tag assignment isn't part of this interface — dua_tags writes happen
// separately in each route, outside appToDb.
export interface DuaInput {
  title: string;
  arabicText: string;
  translation: string;
  transliteration?: string | null;
  description?: string | null;
  source?: string | null;
}

// Convert DB snake_case to app camelCase
export function dbToApp(dua: DbDua): Dua {
  return {
    id: dua.id,
    title: dua.title,
    arabicText: dua.arabic_text,
    translation: dua.translation,
    transliteration: dua.transliteration,
    description: dua.description,
    source: dua.source,
    createdAt: dua.created_at,
    updatedAt: dua.updated_at,
    easeFactor: dua.ease_factor,
    interval: dua.interval,
    repetitions: dua.repetitions,
    nextReviewDate: dua.next_review_date,
  };
}

// Convert app camelCase to DB snake_case
export function appToDb(dua: DuaInput) {
  return {
    title: dua.title,
    arabic_text: dua.arabicText,
    translation: dua.translation,
    transliteration: dua.transliteration || null,
    description: dua.description || null,
    source: dua.source || null,
  };
}

// Type for Tag from database (snake_case)
export interface DbTag {
  id: string;
  name: string;
  created_at: string;
}

// Type for Tag in application (camelCase)
export interface Tag {
  id: string;
  name: string;
  createdAt: string;
}

// Convert DB Tag to app Tag
export function dbTagToApp(tag: DbTag): Tag {
  return {
    id: tag.id,
    name: tag.name,
    createdAt: tag.created_at,
  };
}
